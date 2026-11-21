-- CreateTable
CREATE TABLE `SpeciesImage` (
    `id` VARCHAR(191) NOT NULL,
    `speciesId` VARCHAR(191) NOT NULL,
    `fileKey` VARCHAR(191) NOT NULL,
    `sourceHash` VARCHAR(191) NULL,
    `width` INTEGER NOT NULL,
    `height` INTEGER NOT NULL,
    `caption` TEXT NULL,
    `credit` VARCHAR(191) NULL,
    `license` VARCHAR(191) NULL,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `uploadedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SpeciesImage_fileKey_key`(`fileKey`),
    INDEX `SpeciesImage_speciesId_sortOrder_idx`(`speciesId`, `sortOrder`),
    UNIQUE INDEX `SpeciesImage_speciesId_sourceHash_key`(`speciesId`, `sourceHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SpeciesImage` ADD CONSTRAINT `SpeciesImage_speciesId_fkey` FOREIGN KEY (`speciesId`) REFERENCES `Species`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SpeciesImage` ADD CONSTRAINT `SpeciesImage_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

