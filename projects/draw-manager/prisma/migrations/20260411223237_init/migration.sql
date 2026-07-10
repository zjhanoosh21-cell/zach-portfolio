-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "owner_name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "contract_total_cents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "draw_number" INTEGER NOT NULL DEFAULT 1,
    "start_date" TEXT,
    "completed_at" DATETIME,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "typical_work" TEXT,
    "phone" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "LineItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "work_description" TEXT NOT NULL,
    "line_number" TEXT NOT NULL,
    "original_contract_cents" INTEGER NOT NULL DEFAULT 0,
    "adjusted_contract_cents" INTEGER NOT NULL DEFAULT 0,
    "total_paid_cents" INTEGER NOT NULL DEFAULT 0,
    "retention_withheld_cents" INTEGER NOT NULL DEFAULT 0,
    "lien_waiver_received" BOOLEAN NOT NULL DEFAULT false,
    "lien_waiver_date" TEXT,
    "category" TEXT NOT NULL DEFAULT 'other',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LineItem_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LineItem_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "line_item_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "payment_date" TEXT NOT NULL,
    "notes" TEXT,
    "draw_number" INTEGER NOT NULL,
    "logged_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_line_item_id_fkey" FOREIGN KEY ("line_item_id") REFERENCES "LineItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payment_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChangeOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "line_item_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "direction" TEXT NOT NULL,
    "reason" TEXT,
    "approved_by" TEXT,
    "approved_date" TEXT,
    "logged_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChangeOrder_line_item_id_fkey" FOREIGN KEY ("line_item_id") REFERENCES "LineItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChangeOrder_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "draw_number" INTEGER,
    "vendor_name" TEXT,
    "file_path" TEXT NOT NULL,
    "is_draft" BOOLEAN NOT NULL DEFAULT false,
    "generated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
