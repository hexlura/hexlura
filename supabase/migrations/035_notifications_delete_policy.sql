-- Allow users to delete their own notifications from the new
-- /notifications inbox page. Original migration 002 only granted
-- SELECT + UPDATE.

CREATE POLICY "users_delete_own_notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);
