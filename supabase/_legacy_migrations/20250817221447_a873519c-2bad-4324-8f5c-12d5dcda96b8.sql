-- Check if read_only role exists in user_role enum
-- If not, add it
DO $$
BEGIN
    -- Check if read_only value exists in user_role enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'read_only' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
    ) THEN
        -- Add read_only to user_role enum
        ALTER TYPE user_role ADD VALUE 'read_only';
    END IF;
END $$;