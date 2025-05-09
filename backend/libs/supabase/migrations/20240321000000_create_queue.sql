-- Create the queue table
CREATE TABLE IF NOT EXISTS public.queue (
    id BIGSERIAL PRIMARY KEY,
    task_id UUID NOT NULL,
    state TEXT NOT NULL,
    context JSONB NOT NULL,
    worker_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.queue
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON public.queue
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON public.queue
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON public.queue
    FOR DELETE USING (true);

-- Create function to get next task
CREATE OR REPLACE FUNCTION public.get_next_task(p_worker_id UUID)
RETURNS TABLE (
    id BIGINT,
    task_id UUID,
    state TEXT,
    context JSONB
) AS $$
BEGIN
    RETURN QUERY
    UPDATE public.queue q1
    SET worker_id = p_worker_id
    WHERE q1.id = (
        SELECT q2.id
        FROM public.queue q2
        WHERE q2.worker_id IS NULL
        ORDER BY q2.created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    )
    RETURNING q1.id, q1.task_id, q1.state::TEXT, q1.context;
END;
$$ LANGUAGE plpgsql; 