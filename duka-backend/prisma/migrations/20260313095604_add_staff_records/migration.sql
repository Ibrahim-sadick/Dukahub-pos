-- CreateTable
CREATE TABLE `StaffRecord` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `businessId` INTEGER NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'live',
    `age` INTEGER NOT NULL,
    `nationalId` VARCHAR(191) NOT NULL,
    `placeFrom` VARCHAR(191) NULL,
    `salaryPerMonth` INTEGER NOT NULL,
    `allowance` INTEGER NOT NULL DEFAULT 0,
    `date` DATETIME(3) NOT NULL,
    `message` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StaffRecord_businessId_idx`(`businessId`),
    UNIQUE INDEX `StaffRecord_businessId_employeeId_key`(`businessId`, `employeeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `StaffRecord` ADD CONSTRAINT `StaffRecord_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
