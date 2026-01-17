-- Add DELETE policy for fin_chart_accounts table
CREATE POLICY "Authenticated users can delete fin_chart_accounts"
ON public.fin_chart_accounts
FOR DELETE
USING (true);