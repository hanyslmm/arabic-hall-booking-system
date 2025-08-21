-- Add operating hours columns to halls table
ALTER TABLE public.halls 
ADD COLUMN operating_start_time TIME WITHOUT TIME ZONE,
ADD COLUMN operating_end_time TIME WITHOUT TIME ZONE;