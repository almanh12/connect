-- Allow users to delete their own profile (for account deletion flow)
CREATE POLICY "Users can delete their own profile"
  ON profiles
  FOR DELETE
  USING (id = auth.uid());
