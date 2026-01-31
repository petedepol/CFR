# Neo Settings - Supabase Setup

Run this SQL in Supabase Dashboard when ready:

```sql
-- 1. Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('neo-settings', 'neo-settings', true);

-- 2. Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'neo-settings');

-- 3. Allow public read access (since bucket is public)
CREATE POLICY "Allow public read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'neo-settings');

-- 4. Allow authenticated users to delete their uploads
CREATE POLICY "Allow authenticated deletes"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'neo-settings');
```

**Location:** Supabase Dashboard → SQL Editor → New Query → Paste & Run

**Safe:** This only creates a new storage bucket. Does NOT touch existing data.
