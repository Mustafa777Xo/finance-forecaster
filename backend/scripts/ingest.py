#!/usr/bin/env python3
"""
Data ingestion script for finance forecaster transactions.

This script processes transaction CSV files and stores them in versioned Parquet files
and optionally in DuckDB for analysis.
"""

import argparse
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

import duckdb
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq


def generate_version_path(base_path: str, file_format: str = "parquet") -> str:
    """Generate a versioned file path with timestamp."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    base = Path(base_path)

    if file_format == "parquet":
        return str(base.parent / f"{base.stem}_{timestamp}.parquet")
    else:
        return str(base.parent / f"{base.stem}_{timestamp}.{file_format}")


def get_latest_parquet_file(data_dir: str) -> Optional[str]:
    """Find the most recent parquet file in the data directory."""
    data_path = Path(data_dir)
    if not data_path.exists():
        return None

    parquet_files = list(data_path.glob("transactions_*.parquet"))
    if not parquet_files:
        return None

    # Sort by modification time, return most recent
    latest_file = max(parquet_files, key=lambda p: p.stat().st_mtime)
    return str(latest_file)


def setup_database(
    db_path: str = "data/processed/transactions.db",
) -> duckdb.DuckDBPyConnection:
    """Initialize DuckDB database and create tables if they don't exist."""
    # Ensure the directory exists
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)

    conn = duckdb.connect(db_path)

    # Create transactions table if it doesn't exist
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY,
            date TIMESTAMP,
            category VARCHAR,
            amount DECIMAL(10, 2),
            ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """
    )

    return conn


def validate_csv_data(df: pd.DataFrame) -> tuple[bool, list[str]]:
    """Validate the transaction data."""
    errors = []

    # Check required columns
    required_columns = {"date", "category", "amount"}
    missing_columns = required_columns - set(df.columns)
    if missing_columns:
        errors.append(f"Missing required columns: {missing_columns}")

    # Check for empty dataframe
    if df.empty:
        errors.append("No data found in CSV file")

    # Check for null values in critical columns
    if "amount" in df.columns and df["amount"].isnull().any():
        errors.append("Found null values in amount column")

    # Check for invalid amounts
    if "amount" in df.columns:
        try:
            pd.to_numeric(df["amount"], errors="raise")
        except (ValueError, TypeError):
            errors.append("Invalid numeric values found in amount column")

    # Check date format
    if "date" in df.columns:
        try:
            pd.to_datetime(df["date"], errors="raise")
        except (ValueError, TypeError):
            errors.append("Invalid date format found in date column")

    return len(errors) == 0, errors


def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """Clean and standardize the transaction data."""
    df_clean = df.copy()

    # Convert date column to datetime
    df_clean["date"] = pd.to_datetime(df_clean["date"])

    # Convert amount to numeric
    df_clean["amount"] = pd.to_numeric(df_clean["amount"])

    # Strip whitespace from category
    df_clean["category"] = df_clean["category"].str.strip()

    # Remove duplicates
    initial_count = len(df_clean)
    df_clean = df_clean.drop_duplicates()
    final_count = len(df_clean)

    if initial_count != final_count:
        print(f"Removed {initial_count - final_count} duplicate records")

    return df_clean


def save_to_parquet(df: pd.DataFrame, output_path: str, mode: str = "snapshot") -> str:
    """
    Save DataFrame to Parquet format with versioning.

    Args:
        df: DataFrame to save
        output_path: Base path for output file
        mode: Either "snapshot" (full data) or "incremental" (append)

    Returns:
        Path to the saved file
    """
    # Ensure output directory exists
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    if mode == "snapshot":
        # Create timestamped snapshot
        versioned_path = generate_version_path(output_path, "parquet")

        # Add metadata
        df_with_meta = df.copy()
        df_with_meta["ingested_at"] = datetime.now()

        # Write with optimal settings for analytics
        table = pa.Table.from_pandas(df_with_meta)

        # Add custom metadata
        metadata = {
            "ingestion_timestamp": datetime.now().isoformat(),
            "record_count": str(len(df_with_meta)),
            "version": "snapshot",
            "schema_version": "1.0",
        }

        existing_meta = table.schema.metadata or {}
        existing_meta.update({k.encode(): v.encode() for k, v in metadata.items()})
        table = table.replace_schema_metadata(existing_meta)

        # Write with compression and optimization for analytics
        pq.write_table(
            table,
            versioned_path,
            compression="snappy",
            use_dictionary=True,
            write_statistics=True,
            store_schema=True,
        )

        print(f"Saved snapshot to: {versioned_path}")
        return versioned_path

    else:  # incremental mode
        # For future implementation - could append to existing files
        # or create incremental updates
        raise NotImplementedError("Incremental mode not yet implemented")


def load_from_parquet(file_path: str) -> pd.DataFrame:
    """Load data from Parquet file."""
    if not Path(file_path).exists():
        raise FileNotFoundError(f"Parquet file not found: {file_path}")

    df = pd.read_parquet(file_path)
    print(f"Loaded {len(df)} records from {file_path}")

    return df


def get_parquet_metadata(file_path: str) -> dict:
    """Get metadata from Parquet file."""
    if not Path(file_path).exists():
        return {}

    parquet_file = pq.ParquetFile(file_path)
    schema_metadata = parquet_file.schema_arrow.metadata or {}

    # Decode metadata
    decoded_meta = {}
    for key, value in schema_metadata.items():
        try:
            decoded_meta[key.decode()] = value.decode()
        except UnicodeDecodeError:
            decoded_meta[key] = value

    return {
        "file_metadata": decoded_meta,
        "num_rows": parquet_file.metadata.num_rows,
        "num_columns": parquet_file.metadata.num_columns,
        "created_by": parquet_file.metadata.created_by,
        "schema": str(parquet_file.schema_arrow),
    }


def insert_to_duckdb(df: pd.DataFrame, conn: duckdb.DuckDBPyConnection) -> int:
    """Insert data into DuckDB database."""
    # Get the next available ID
    max_id = conn.execute("SELECT COALESCE(MAX(id), 0) FROM transactions").fetchone()[0]

    # Convert DataFrame to list of tuples for insertion with IDs
    records = []
    for i, (_, row) in enumerate(df.iterrows()):
        records.append(
            (
                max_id + i + 1,
                row["date"].to_pydatetime(),
                row["category"],
                float(row["amount"]),
            )
        )

    # Insert records
    conn.executemany(
        """
        INSERT INTO transactions (id, date, category, amount)
        VALUES (?, ?, ?, ?)
    """,
        records,
    )

    return len(records)


def ingest_transactions(
    csv_path: str,
    parquet_path: str = "data/processed/transactions.parquet",
    db_path: Optional[str] = None,
    output_format: str = "parquet",
    mode: str = "snapshot",
) -> None:
    """Main ingestion function."""
    print(f"Starting ingestion of {csv_path}")
    print(f"Output format: {output_format}")
    print(f"Mode: {mode}")

    try:
        # Read CSV file
        print(f"Reading CSV file: {csv_path}")
        df = pd.read_csv(csv_path)
        print(f"Loaded {len(df)} records")

        # Validate data
        print("Validating data...")
        is_valid, errors = validate_csv_data(df)
        if not is_valid:
            print("Validation errors found:")
            for error in errors:
                print(f"  - {error}")
            sys.exit(1)

        # Clean data
        print("Cleaning data...")
        df_clean = clean_data(df)
        print(f"Data cleaned, {len(df_clean)} records ready for ingestion")

        # Save to Parquet (primary format)
        if output_format in ["parquet", "both"]:
            print("Saving to Parquet format...")
            saved_path = save_to_parquet(df_clean, parquet_path, mode)

            # Show metadata
            metadata = get_parquet_metadata(saved_path)
            print(f"Parquet metadata: {metadata['file_metadata']}")

        # Optionally save to DuckDB
        if output_format in ["duckdb", "both"] and db_path:
            print(f"Saving to DuckDB: {db_path}")
            conn = setup_database(db_path)

            # Check existing records
            existing_count = conn.execute(
                "SELECT COUNT(*) FROM transactions"
            ).fetchone()[0]
            print(f"Existing records in database: {existing_count}")

            # Insert new data
            new_records = insert_to_duckdb(df_clean, conn)

            # Get final count
            final_count = conn.execute("SELECT COUNT(*) FROM transactions").fetchone()[
                0
            ]
            print(f"Successfully inserted {new_records} new records")
            print(f"Total records in database: {final_count}")

            # Show sample
            print("\nSample of data in DuckDB:")
            sample = conn.execute(
                """
                SELECT date, category, amount
                FROM transactions
                ORDER BY date DESC
                LIMIT 5
            """
            ).fetchall()

            for record in sample:
                print(f"  {record[0]} | {record[1]} | ${record[2]:.2f}")

            conn.close()

        # Show summary
        print("\n✅ Ingestion completed successfully!")
        print(f"   📊 Records processed: {len(df_clean)}")

        if output_format in ["parquet", "both"]:
            print(f"   📁 Parquet file: {saved_path}")
            print(f"   📈 Categories: {df_clean['category'].nunique()}")
            print(
                f"   📅 Date range: {df_clean['date'].min()} to {df_clean['date'].max()}"
            )
            print(f"   💰 Total amount: ${df_clean['amount'].sum():.2f}")

    except FileNotFoundError:
        print(f"Error: File {csv_path} not found")
        sys.exit(1)
    except Exception as e:
        print(f"Error during ingestion: {e}")
        sys.exit(1)


def list_versions(data_dir: str = "data/processed") -> None:
    """List all available parquet versions."""
    data_path = Path(data_dir)
    if not data_path.exists():
        print(f"Data directory {data_dir} does not exist")
        return

    parquet_files = sorted(data_path.glob("transactions_*.parquet"))

    if not parquet_files:
        print("No parquet versions found")
        return

    print("Available transaction versions:")
    print("-" * 60)

    for file_path in parquet_files:
        try:
            metadata = get_parquet_metadata(str(file_path))
            file_meta = metadata.get("file_metadata", {})

            timestamp = file_meta.get("ingestion_timestamp", "Unknown")
            record_count = file_meta.get("record_count", "Unknown")

            print(f"📁 {file_path.name}")
            print(f"   📅 Ingested: {timestamp}")
            print(f"   📊 Records: {record_count}")
            print(f"   💾 Size: {file_path.stat().st_size / 1024:.1f} KB")
            print()

        except Exception as e:
            print(f"📁 {file_path.name} (metadata error: {e})")


def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(
        description="Ingest transaction CSV data into versioned Parquet files "
        "and/or DuckDB database"
    )
    parser.add_argument(
        "csv_file", nargs="?", help="Path to the CSV file containing transaction data"
    )
    parser.add_argument(
        "--parquet-path",
        default="data/processed/transactions.parquet",
        help="Base path for the Parquet output file "
        "(default: data/processed/transactions.parquet)",
    )
    parser.add_argument("--db-path", help="Path to the DuckDB database file (optional)")
    parser.add_argument(
        "--format",
        choices=["parquet", "duckdb", "both"],
        default="parquet",
        help="Output format (default: parquet)",
    )
    parser.add_argument(
        "--mode",
        choices=["snapshot", "incremental"],
        default="snapshot",
        help="Ingestion mode (default: snapshot)",
    )
    parser.add_argument(
        "--list-versions",
        action="store_true",
        help="List all available parquet versions and exit",
    )

    args = parser.parse_args()

    # Handle version listing
    if args.list_versions:
        list_versions()
        return

    # Validate required arguments
    if not args.csv_file:
        print("Error: CSV file path is required (unless using --list-versions)")
        parser.print_help()
        sys.exit(1)

    # Validate input file exists
    if not Path(args.csv_file).exists():
        print(f"Error: File {args.csv_file} does not exist")
        sys.exit(1)

    # If using DuckDB format, ensure db-path is provided
    if args.format in ["duckdb", "both"] and not args.db_path:
        args.db_path = "data/processed/transactions.db"
        print(f"Using default DuckDB path: {args.db_path}")

    ingest_transactions(
        args.csv_file, args.parquet_path, args.db_path, args.format, args.mode
    )


if __name__ == "__main__":
    main()
