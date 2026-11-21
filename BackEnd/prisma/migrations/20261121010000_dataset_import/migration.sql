-- DropForeignKey
ALTER TABLE `Observation` DROP FOREIGN KEY `Observation_observerId_fkey`;

-- AlterTable
ALTER TABLE `Species` ADD COLUMN `authorship` VARCHAR(191) NULL,
    ADD COLUMN `family` VARCHAR(191) NULL,
    ADD COLUMN `genus` VARCHAR(191) NULL,
    ADD COLUMN `taxonClass` VARCHAR(191) NULL,
    ADD COLUMN `taxonOrder` VARCHAR(191) NULL,
    MODIFY `group` ENUM('MAMMAL', 'BIRD', 'REPTILE', 'AMPHIBIAN', 'PLANT') NOT NULL,
    MODIFY `status` ENUM('LC', 'NT', 'VU', 'EN', 'CR', 'EW', 'EX', 'DD', 'NE', 'HERITAGE') NOT NULL DEFAULT 'NE',
    MODIFY `statusLabel` VARCHAR(191) NULL,
    MODIFY `description` TEXT NULL,
    MODIFY `habitat` TEXT NULL;

-- AlterTable
ALTER TABLE `Observation` ADD COLUMN `basisOfRecord` ENUM('HUMAN_OBSERVATION', 'PRESERVED_SPECIMEN', 'MACHINE_OBSERVATION', 'OTHER') NOT NULL DEFAULT 'HUMAN_OBSERVATION',
    ADD COLUMN `datasetId` VARCHAR(191) NULL,
    ADD COLUMN `externalId` VARCHAR(191) NULL,
    ADD COLUMN `identifiedBy` VARCHAR(191) NULL,
    ADD COLUMN `preparations` VARCHAR(191) NULL,
    MODIFY `observerId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Dataset` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `kind` VARCHAR(191) NOT NULL,
    `sourceFile` VARCHAR(191) NULL,
    `publisher` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `importedById` VARCHAR(191) NULL,
    `importedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Dataset_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Transect` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `lengthKm` DOUBLE NOT NULL,
    `name` VARCHAR(191) NULL,

    UNIQUE INDEX `Transect_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TransectSurvey` (
    `id` VARCHAR(191) NOT NULL,
    `transectId` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `repeatDays` INTEGER NOT NULL DEFAULT 3,
    `speciesId` VARCHAR(191) NULL,
    `datasetId` VARCHAR(191) NULL,
    `note` TEXT NULL,

    UNIQUE INDEX `TransectSurvey_transectId_year_key`(`transectId`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TransectSighting` (
    `id` VARCHAR(191) NOT NULL,
    `surveyId` VARCHAR(191) NOT NULL,
    `groupCode` VARCHAR(191) NOT NULL,
    `individuals` INTEGER NOT NULL,
    `utmX` DOUBLE NULL,
    `utmY` DOUBLE NULL,
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,
    `altitudeM` DOUBLE NULL,
    `distanceM` DOUBLE NULL,
    `bearingDeg` DOUBLE NULL,
    `habitat` ENUM('PLANTATION', 'RICH', 'POOR') NULL,
    `offsetAngleDeg` DOUBLE NULL,
    `perpendicularDistanceM` DOUBLE NULL,
    `flagged` BOOLEAN NOT NULL DEFAULT false,
    `flagNote` TEXT NULL,

    UNIQUE INDEX `TransectSighting_surveyId_groupCode_key`(`surveyId`, `groupCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Species_scientificName_key` ON `Species`(`scientificName`);

-- CreateIndex
CREATE UNIQUE INDEX `Observation_externalId_key` ON `Observation`(`externalId`);

-- CreateIndex
CREATE INDEX `Observation_speciesId_observedAt_idx` ON `Observation`(`speciesId`, `observedAt`);

-- CreateIndex
CREATE INDEX `Observation_datasetId_idx` ON `Observation`(`datasetId`);

-- AddForeignKey
ALTER TABLE `Observation` ADD CONSTRAINT `Observation_observerId_fkey` FOREIGN KEY (`observerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Observation` ADD CONSTRAINT `Observation_datasetId_fkey` FOREIGN KEY (`datasetId`) REFERENCES `Dataset`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dataset` ADD CONSTRAINT `Dataset_importedById_fkey` FOREIGN KEY (`importedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransectSurvey` ADD CONSTRAINT `TransectSurvey_transectId_fkey` FOREIGN KEY (`transectId`) REFERENCES `Transect`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransectSurvey` ADD CONSTRAINT `TransectSurvey_speciesId_fkey` FOREIGN KEY (`speciesId`) REFERENCES `Species`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransectSurvey` ADD CONSTRAINT `TransectSurvey_datasetId_fkey` FOREIGN KEY (`datasetId`) REFERENCES `Dataset`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransectSighting` ADD CONSTRAINT `TransectSighting_surveyId_fkey` FOREIGN KEY (`surveyId`) REFERENCES `TransectSurvey`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

