-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMPTZ(6),
    "refreshTokenExpiresAt" TIMESTAMPTZ(6),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_profile" (
    "user_id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_profile_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "app_plan" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "profile" JSONB NOT NULL,
    "weeks" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "app_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_progress" (
    "user_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "done" JSONB NOT NULL DEFAULT '{}',
    "known" JSONB NOT NULL DEFAULT '{}',
    "notes" JSONB NOT NULL DEFAULT '{}',
    "anki" JSONB NOT NULL DEFAULT '{}',
    "current_week" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_progress_pkey" PRIMARY KEY ("user_id","plan_id")
);

-- CreateTable
CREATE TABLE "app_calendar_export" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "calendar_id" TEXT NOT NULL,
    "calendar_name" TEXT,
    "event_count" INTEGER NOT NULL DEFAULT 0,
    "start_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_calendar_export_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_lesson" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "lesson_date" DATE NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'A1',
    "week_n" INTEGER,
    "questions" JSONB NOT NULL,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "results" JSONB NOT NULL DEFAULT '{}',
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "study" JSONB,
    "week_lesson_id" TEXT,
    "part_idx" INTEGER,

    CONSTRAINT "app_lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_reminder" (
    "user_id" TEXT NOT NULL,
    "calendar_id" TEXT NOT NULL DEFAULT 'primary',
    "event_id" TEXT NOT NULL,
    "reminder_time" TEXT NOT NULL DEFAULT '19:00',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_reminder_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "app_vocab" (
    "user_id" TEXT NOT NULL,
    "words" JSONB NOT NULL DEFAULT '[]',
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_vocab_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "app_pron" (
    "text" TEXT NOT NULL,
    "say" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_pron_pkey" PRIMARY KEY ("text")
);

-- CreateTable
CREATE TABLE "app_week_lesson" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "week_n" INTEGER NOT NULL,
    "level" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "theme" TEXT,
    "outline" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_week_lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_lesson_part" (
    "week_lesson_id" TEXT NOT NULL,
    "idx" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_lesson_part_pkey" PRIMARY KEY ("week_lesson_id","idx")
);

-- CreateTable
CREATE TABLE "app_lesson_chat" (
    "id" BIGSERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "week_lesson_id" TEXT NOT NULL,
    "part_idx" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_lesson_chat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE INDEX "app_plan_user_id_created_at_idx" ON "app_plan"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "app_calendar_export_user_id_created_at_idx" ON "app_calendar_export"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "app_lesson_user_id_lesson_date_idx" ON "app_lesson"("user_id", "lesson_date" DESC);

-- CreateIndex
CREATE INDEX "app_lesson_user_id_completed_at_idx" ON "app_lesson"("user_id", "completed_at");

-- CreateIndex
CREATE UNIQUE INDEX "app_lesson_user_id_lesson_date_key" ON "app_lesson"("user_id", "lesson_date");

-- CreateIndex
CREATE UNIQUE INDEX "app_week_lesson_user_id_plan_id_week_n_key" ON "app_week_lesson"("user_id", "plan_id", "week_n");

-- CreateIndex
CREATE INDEX "app_lesson_chat_week_lesson_id_part_idx_created_at_idx" ON "app_lesson_chat"("week_lesson_id", "part_idx", "created_at");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_profile" ADD CONSTRAINT "app_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_plan" ADD CONSTRAINT "app_plan_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_progress" ADD CONSTRAINT "app_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_calendar_export" ADD CONSTRAINT "app_calendar_export_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_lesson" ADD CONSTRAINT "app_lesson_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_lesson" ADD CONSTRAINT "app_lesson_week_lesson_id_fkey" FOREIGN KEY ("week_lesson_id") REFERENCES "app_week_lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_reminder" ADD CONSTRAINT "app_reminder_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_vocab" ADD CONSTRAINT "app_vocab_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_week_lesson" ADD CONSTRAINT "app_week_lesson_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_lesson_part" ADD CONSTRAINT "app_lesson_part_week_lesson_id_fkey" FOREIGN KEY ("week_lesson_id") REFERENCES "app_week_lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_lesson_chat" ADD CONSTRAINT "app_lesson_chat_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_lesson_chat" ADD CONSTRAINT "app_lesson_chat_week_lesson_id_fkey" FOREIGN KEY ("week_lesson_id") REFERENCES "app_week_lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Regras das Lições que o schema do Prisma não expressa
ALTER TABLE "app_lesson_part" ADD CONSTRAINT "app_lesson_part_idx_check" CHECK ("idx" BETWEEN 0 AND 5);
ALTER TABLE "app_lesson_chat" ADD CONSTRAINT "app_lesson_chat_role_check" CHECK ("role" IN ('aluno', 'professor'));

-- RLS ligado, sem políticas: o app acessa pelo servidor, e a chave pública do Supabase não lê nada
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app_profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app_plan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app_progress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app_calendar_export" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app_lesson" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app_reminder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app_vocab" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app_pron" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app_week_lesson" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app_lesson_part" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app_lesson_chat" ENABLE ROW LEVEL SECURITY;
