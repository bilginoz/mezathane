-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "serviceFeeAmount" DOUBLE PRECISION,
ADD COLUMN     "serviceFeeDueDate" TIMESTAMP(3),
ADD COLUMN     "serviceFeeKDV" DOUBLE PRECISION,
ADD COLUMN     "serviceFeePaidAt" TIMESTAMP(3),
ADD COLUMN     "serviceFeeReportedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PlatformSettings" ADD COLUMN     "directRevenueModel" TEXT NOT NULL DEFAULT 'KONTOR',
ADD COLUMN     "serviceFeeRate" DOUBLE PRECISION NOT NULL DEFAULT 7.0;
