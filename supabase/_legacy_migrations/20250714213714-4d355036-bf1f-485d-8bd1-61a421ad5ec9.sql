-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security for audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for audit_logs (only admins can view)
CREATE POLICY "Only admins can view audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role = 'ADMIN'
));

-- Create function to log booking creation
CREATE OR REPLACE FUNCTION public.log_booking_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert notification for all admin and manager users
  INSERT INTO public.notifications (user_id, message)
  SELECT p.id, 'تم إنشاء حجز جديد في ' || h.name
  FROM public.profiles p
  CROSS JOIN public.halls h
  WHERE (p.role = 'ADMIN' OR p.user_role IN ('owner', 'manager'))
    AND h.id = NEW.hall_id;
  
  -- Insert audit log
  INSERT INTO public.audit_logs (actor_user_id, action, details)
  VALUES (
    NEW.created_by,
    'booking_created',
    jsonb_build_object(
      'booking_id', NEW.id,
      'hall_id', NEW.hall_id,
      'teacher_id', NEW.teacher_id
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for booking creation
CREATE TRIGGER trigger_log_booking_creation
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.log_booking_creation();