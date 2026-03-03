
-- Create branches table
CREATE TABLE public.branches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create employees table
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  position TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Many-to-many junction table
CREATE TABLE public.employee_branches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  UNIQUE(employee_id, branch_id)
);

-- Enable RLS
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_branches ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (no auth required for this simple app)
CREATE POLICY "Allow all access to branches" ON public.branches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to employees" ON public.employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to employee_branches" ON public.employee_branches FOR ALL USING (true) WITH CHECK (true);
