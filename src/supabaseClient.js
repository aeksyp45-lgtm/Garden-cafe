import { createClient } from "@supabase/supabase-js";

// ຄ່າເຫຼົ່ານີ້ແມ່ນ "anon public key" ຂອງໂປຣເຈັກ Supabase — ອອກແບບມາໃຫ້ໃຊ້
// ຝັ່ງ frontend ໄດ້ຢ່າງປອດໄພ (ບໍ່ຄືກັນກັບ service_role key ຫຼືລະຫັດຜ່ານຖານຂໍ້ມູນ
// ເຊິ່ງຫ້າມເອົາໃສ່ໂຄ້ດ frontend ເດັດຂາດ)
const supabaseUrl = "https://dluvclmyljbtnzoftaam.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsdXZjbG15bGpidG56b2Z0YWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxODI0NjEsImV4cCI6MjA5OTc1ODQ2MX0.wIUzRqLcG9WQJ0EP6__hvZZyJV7OW-XGHVVrLW9D5mI";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
