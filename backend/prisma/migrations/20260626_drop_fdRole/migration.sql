-- Step 1: Drop the default constraint on fdRole
ALTER TABLE tbUsers DROP CONSTRAINT tbUsers_fdRole_df;

-- Step 2: Drop the fdRole column
ALTER TABLE tbUsers DROP COLUMN fdRole;
