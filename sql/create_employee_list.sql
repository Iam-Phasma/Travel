-- Create employee_list table
CREATE TABLE IF NOT EXISTS employee_list (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- If table already exists, add is_active column (run this if updating existing table)
-- ALTER TABLE employee_list ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Enable Row Level Security
ALTER TABLE employee_list ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read employee list
CREATE POLICY "Allow authenticated users to read employee list"
ON employee_list
FOR SELECT
TO authenticated
USING (true);

-- Create policy to allow admin users to insert/update/delete
CREATE POLICY "Allow admin and super users to manage employee list"
ON employee_list
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin','super')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin','super')
    )
);
