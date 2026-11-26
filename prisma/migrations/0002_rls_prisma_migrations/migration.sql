-- A tabela de controle do Prisma também fica com RLS, sem políticas: a chave pública do
-- Supabase não lê nem altera o histórico. O Prisma conecta como dono e não é afetado.
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
