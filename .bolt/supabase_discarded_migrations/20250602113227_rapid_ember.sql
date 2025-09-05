-- Add new columns to users_profile table
ALTER TABLE users_profile 
ADD COLUMN IF NOT EXISTS fonction text DEFAULT '----',
ADD COLUMN IF NOT EXISTS acces_pilotage text,
ADD COLUMN IF NOT EXISTS acces_evaluation text,
ADD COLUMN IF NOT EXISTS acces_reporting text,
ADD COLUMN IF NOT EXISTS langue text,
ADD COLUMN IF NOT EXISTS adresse text,
ADD COLUMN IF NOT EXISTS ville text,
ADD COLUMN IF NOT EXISTS pays text,
ADD COLUMN IF NOT EXISTS numero text,
ADD COLUMN IF NOT EXISTS photo_profil text,
ADD COLUMN IF NOT EXISTS est_bloque boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS titre text,
ADD COLUMN IF NOT EXISTS entreprise text;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  email text REFERENCES users_profile(email) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('contributeur', 'validateur', 'admin_client')),
  scope text NOT NULL CHECK (role IN ('site', 'filiale', 'filiere', 'groupe')),
  scope_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (email, role, scope, scope_id)
);

-- Create user_process_assignments table
CREATE TABLE IF NOT EXISTS user_process_assignments (
  email text REFERENCES users_profile(email) ON DELETE CASCADE,
  processus_code text REFERENCES processus(code) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('contributeur', 'validateur')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (email, processus_code)
);

-- Create user_actions_log table
CREATE TABLE IF NOT EXISTS user_actions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text REFERENCES users_profile(email) ON DELETE SET NULL,
  action_type text NOT NULL CHECK (action_type IN ('edit', 'validate', 'reject', 'comment')),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_process_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_actions_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own roles"
ON user_roles FOR SELECT
TO authenticated
USING (email = auth.jwt() ->> 'email');

CREATE POLICY "Admin can manage all roles"
ON user_roles FOR ALL
TO authenticated
USING ((auth.jwt() ->> 'role'::text) = 'admin'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'admin'::text);

CREATE POLICY "Users can view their own assignments"
ON user_process_assignments FOR SELECT
TO authenticated
USING (email = auth.jwt() ->> 'email');

CREATE POLICY "Admin can manage all assignments"
ON user_process_assignments FOR ALL
TO authenticated
USING ((auth.jwt() ->> 'role'::text) = 'admin'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'admin'::text);

CREATE POLICY "Users can view relevant action logs"
ON user_actions_log FOR SELECT
TO authenticated
USING (
  email = auth.jwt() ->> 'email' 
  OR (auth.jwt() ->> 'role'::text) = 'admin'::text
  OR EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.email = auth.jwt() ->> 'email'
    AND ur.role = 'admin_client'
  )
);

CREATE POLICY "Users can create their own action logs"
ON user_actions_log FOR INSERT
TO authenticated
WITH CHECK (email = auth.jwt() ->> 'email');

-- Create updated_at triggers
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_process_assignments_updated_at
  BEFORE UPDATE ON user_process_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();