-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'RANGER', 'VIEWER') NOT NULL DEFAULT 'RANGER',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Species` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `tag` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `scientificName` VARCHAR(191) NOT NULL,
    `group` ENUM('MAMMAL', 'BIRD', 'REPTILE', 'PLANT') NOT NULL,
    `status` ENUM('LC', 'NT', 'VU', 'EN', 'CR', 'EW', 'EX', 'DD', 'HERITAGE') NOT NULL,
    `statusLabel` VARCHAR(191) NOT NULL,
    `populationLabel` VARCHAR(191) NULL,
    `description` TEXT NOT NULL,
    `habitat` TEXT NOT NULL,
    `threats` JSON NOT NULL,
    `featured` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Species_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PopulationRecord` (
    `id` VARCHAR(191) NOT NULL,
    `speciesId` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `value` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PopulationRecord_speciesId_year_key`(`speciesId`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Zone` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,

    UNIQUE INDEX `Zone_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MonitoringStation` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('WATER', 'AIR', 'SOIL') NOT NULL,
    `rating` VARCHAR(191) NOT NULL,
    `score` INTEGER NOT NULL,
    `metric` VARCHAR(191) NOT NULL,
    `level` ENUM('GOOD', 'GOOD_2', 'FAIR', 'POOR') NOT NULL,
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Observation` (
    `id` VARCHAR(191) NOT NULL,
    `speciesId` VARCHAR(191) NOT NULL,
    `observerId` VARCHAR(191) NOT NULL,
    `place` VARCHAR(191) NOT NULL,
    `note` TEXT NULL,
    `count` INTEGER NULL,
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `observedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewedById` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MapPin` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `lat` DOUBLE NOT NULL,
    `lng` DOUBLE NOT NULL,
    `color` VARCHAR(191) NULL,
    `countLabel` VARCHAR(191) NULL,
    `lastSeenAt` DATETIME(3) NULL,
    `zoneId` VARCHAR(191) NULL,
    `speciesId` VARCHAR(191) NULL,
    `stationId` VARCHAR(191) NULL,
    `observationId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `MapPin_stationId_key`(`stationId`),
    UNIQUE INDEX `MapPin_observationId_key`(`observationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PopulationRecord` ADD CONSTRAINT `PopulationRecord_speciesId_fkey` FOREIGN KEY (`speciesId`) REFERENCES `Species`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Observation` ADD CONSTRAINT `Observation_speciesId_fkey` FOREIGN KEY (`speciesId`) REFERENCES `Species`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Observation` ADD CONSTRAINT `Observation_observerId_fkey` FOREIGN KEY (`observerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Observation` ADD CONSTRAINT `Observation_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MapPin` ADD CONSTRAINT `MapPin_zoneId_fkey` FOREIGN KEY (`zoneId`) REFERENCES `Zone`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MapPin` ADD CONSTRAINT `MapPin_speciesId_fkey` FOREIGN KEY (`speciesId`) REFERENCES `Species`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MapPin` ADD CONSTRAINT `MapPin_stationId_fkey` FOREIGN KEY (`stationId`) REFERENCES `MonitoringStation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MapPin` ADD CONSTRAINT `MapPin_observationId_fkey` FOREIGN KEY (`observationId`) REFERENCES `Observation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
