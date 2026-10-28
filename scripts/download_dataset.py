import os
import sys
import collections
import duckdb
import pandas as pd

def main():
    output_dir = "data"
    output_file = os.path.join(output_dir, "cf_problems.parquet")
    os.makedirs(output_dir, exist_ok=True)

    print("Connecting to DuckDB...")
    con = duckdb.connect()

    hf_pattern = "hf://datasets/open-r1/codeforces/data/*.parquet"

    # Query with column selection and deduplication by id
    # "index" is enclosed in double quotes because it is a reserved SQL word.
    query = f"""
    COPY (
        SELECT id, contest_id, "index", title,
               description, input_format, output_format, note,
               editorial, rating, tags
        FROM '{hf_pattern}'
        QUALIFY ROW_NUMBER() OVER (PARTITION BY id) = 1
    ) TO '{output_file.replace(os.sep, '/')}' (FORMAT PARQUET)
    """

    print("Querying Hugging Face dataset and downloading selected columns...")
    try:
        con.execute(query)
    except Exception as e:
        err_msg = str(e)
        if any(keyword in err_msg.lower() for keyword in ["429", "rate limit", "401", "403", "unauthorized", "authentication"]):
            print(f"\n[ERROR] Authentication or Rate-Limit encountered: {err_msg}", file=sys.stderr)
            print("Stopping execution as requested. Please provide a Hugging Face token.", file=sys.stderr)
            sys.exit(2)
        else:
            print(f"\n[ERROR] Download failed: {err_msg}", file=sys.stderr)
            raise

    # Check file size
    if not os.path.exists(output_file):
        print(f"[ERROR] Output file {output_file} not found!", file=sys.stderr)
        sys.exit(1)

    file_size_bytes = os.path.getsize(output_file)
    file_size_mb = file_size_bytes / (1024 * 1024)

    if file_size_mb > 1024:
        print(f"\n[WARNING] Output file size ({file_size_mb:.2f} MB) exceeds 1 GB limit!", file=sys.stderr)
        print("Stopping execution as requested, because unneeded columns may have been downloaded.", file=sys.stderr)
        sys.exit(3)

    print("\nReading generated parquet file to compute metrics...")
    df = pd.read_parquet(output_file)

    total_problems = len(df)
    rated_count = df["rating"].notna().sum()
    
    # Check tags (handle list, ndarray or string)
    def has_tag(tags_val):
        if tags_val is None or (isinstance(tags_val, float) and pd.isna(tags_val)):
            return False
        if hasattr(tags_val, "__len__"):
            return len(tags_val) > 0
        return bool(tags_val)

    tag_count = df["tags"].apply(has_tag).sum()

    # Check editorial (non-null and non-empty)
    def has_editorial(ed_val):
        if ed_val is None or (isinstance(ed_val, float) and pd.isna(ed_val)):
            return False
        return bool(str(ed_val).strip())

    editorial_count = df["editorial"].apply(has_editorial).sum()

    # 10 most common tags
    tag_counter = collections.Counter()
    for tags_val in df["tags"].dropna():
        if hasattr(tags_val, "__iter__") and not isinstance(tags_val, (str, bytes)):
            for t in tags_val:
                if t:
                    tag_counter[str(t).strip()] += 1
        elif isinstance(tags_val, str) and tags_val.strip():
            tag_counter[tags_val.strip()] += 1

    top_10_tags = tag_counter.most_common(10)

    print("\n" + "="*50)
    print("DATASET SUMMARY")
    print("="*50)
    print(f"Total number of problems: {total_problems}")
    print(f"Number with a rating: {rated_count}")
    print(f"Number with at least one tag: {tag_count}")
    print(f"Number with an editorial: {editorial_count}")
    print(f"Output file size: {file_size_mb:.2f} MB")
    print("\n10 most common tags with counts:")
    for rank, (tag, count) in enumerate(top_10_tags, start=1):
        print(f"  {rank:2d}. {tag}: {count}")
    print("="*50)

if __name__ == "__main__":
    main()
