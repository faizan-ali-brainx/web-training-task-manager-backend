-- CreateTable
CREATE TABLE "TodoCollaborator" (
    "id" SERIAL NOT NULL,
    "todoId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "invitedBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TodoCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TodoCollaborator_todoId_userId_key" ON "TodoCollaborator"("todoId", "userId");

-- AddForeignKey
ALTER TABLE "TodoCollaborator" ADD CONSTRAINT "TodoCollaborator_todoId_fkey" FOREIGN KEY ("todoId") REFERENCES "Todo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoCollaborator" ADD CONSTRAINT "TodoCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
