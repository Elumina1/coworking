-- Updated schema for coworking project
-- Added payment.user_id and enforced NOT NULL on required foreign keys to match Sequelize models

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema coworking
-- -----------------------------------------------------
DROP SCHEMA IF EXISTS `coworking` ;
CREATE SCHEMA IF NOT EXISTS `coworking` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci ;
USE `coworking` ;

-- -----------------------------------------------------
-- Table `coworking`.`roles`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `coworking`.`roles` ;
CREATE TABLE IF NOT EXISTS `coworking`.`roles` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `role_name` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB
AUTO_INCREMENT = 3
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;
CREATE UNIQUE INDEX `role_name` ON `coworking`.`roles` (`role_name` ASC) VISIBLE;

-- -----------------------------------------------------
-- Table `coworking`.`users`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `coworking`.`users` ;
CREATE TABLE IF NOT EXISTS `coworking`.`users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `role_id` INT NOT NULL,
  `full_name` VARCHAR(50) NOT NULL,
  `second_name` VARCHAR(50) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `users_ibfk_1`
    FOREIGN KEY (`role_id`)
    REFERENCES `coworking`.`roles` (`id`)
) ENGINE = InnoDB
AUTO_INCREMENT = 7
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;
CREATE UNIQUE INDEX `email` ON `coworking`.`users` (`email` ASC) VISIBLE;
CREATE INDEX `role_id` ON `coworking`.`users` (`role_id` ASC) VISIBLE;

-- -----------------------------------------------------
-- Table `coworking`.`work_types`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `coworking`.`work_types` ;
CREATE TABLE IF NOT EXISTS `coworking`.`work_types` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `type_name` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB
AUTO_INCREMENT = 10
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;

-- -----------------------------------------------------
-- Table `coworking`.`workspace`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `coworking`.`workspace` ;
CREATE TABLE IF NOT EXISTS `coworking`.`workspace` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `work_type_id` INT NOT NULL,
  `workspace_name` VARCHAR(50) NOT NULL,
  `is_available` TINYINT(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  CONSTRAINT `workspace_ibfk_1`
    FOREIGN KEY (`work_type_id`)
    REFERENCES `coworking`.`work_types` (`id`)
) ENGINE = InnoDB
AUTO_INCREMENT = 4
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;
CREATE INDEX `work_type_id` ON `coworking`.`workspace` (`work_type_id` ASC) VISIBLE;

-- -----------------------------------------------------
-- Table `coworking`.`booking`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `coworking`.`booking` ;
CREATE TABLE IF NOT EXISTS `coworking`.`booking` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `workspace_id` INT NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `total_price` DECIMAL(10,2) NULL DEFAULT NULL,
  `price_per_day` DECIMAL(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Цена за день на момент бронирования',
  `booking_status` VARCHAR(20) NOT NULL DEFAULT 'pending',
  PRIMARY KEY (`id`),
  CONSTRAINT `booking_ibfk_1`
    FOREIGN KEY (`user_id`)
    REFERENCES `coworking`.`users` (`id`),
  CONSTRAINT `booking_ibfk_2`
    FOREIGN KEY (`workspace_id`)
    REFERENCES `coworking`.`workspace` (`id`)
) ENGINE = InnoDB
AUTO_INCREMENT = 3
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;
CREATE INDEX `user_id` ON `coworking`.`booking` (`user_id` ASC) VISIBLE;
CREATE INDEX `workspace_id` ON `coworking`.`booking` (`workspace_id` ASC) VISIBLE;

-- -----------------------------------------------------
-- Table `coworking`.`notifications_email`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `coworking`.`notifications_email` ;
CREATE TABLE IF NOT EXISTS `coworking`.`notifications_email` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `booking_id` INT NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `body` TEXT NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
  `error_message` TEXT NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `sent_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `notifications_email_ibfk_1`
    FOREIGN KEY (`user_id`)
    REFERENCES `coworking`.`users` (`id`),
  CONSTRAINT `notifications_email_ibfk_2`
    FOREIGN KEY (`booking_id`)
    REFERENCES `coworking`.`booking` (`id`)
) ENGINE = InnoDB
AUTO_INCREMENT = 2
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;
CREATE INDEX `user_id` ON `coworking`.`notifications_email` (`user_id` ASC) VISIBLE;
CREATE INDEX `booking_id` ON `coworking`.`notifications_email` (`booking_id` ASC) VISIBLE;

-- -----------------------------------------------------
-- Table `coworking`.`payment`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `coworking`.`payment` ;
CREATE TABLE IF NOT EXISTS `coworking`.`payment` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `booking_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `external_id` VARCHAR(255) NULL DEFAULT NULL,
  `receipt_id` VARCHAR(255) NULL DEFAULT NULL,
  `refund_id` VARCHAR(255) NULL DEFAULT NULL,
  `payment_status` VARCHAR(30) NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `payment_ibfk_1`
    FOREIGN KEY (`booking_id`)
    REFERENCES `coworking`.`booking` (`id`),
  CONSTRAINT `payment_ibfk_2`
    FOREIGN KEY (`user_id`)
    REFERENCES `coworking`.`users` (`id`)
) ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;
CREATE INDEX `booking_id` ON `coworking`.`payment` (`booking_id` ASC) VISIBLE;
CREATE INDEX `user_id` ON `coworking`.`payment` (`user_id` ASC) VISIBLE;

-- -----------------------------------------------------
-- Table `coworking`.`price`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `coworking`.`price` ;
CREATE TABLE IF NOT EXISTS `coworking`.`price` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `work_type_id` INT NOT NULL,
  `price_day` DECIMAL(10,2) NOT NULL,
  `effective_from` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Дата начала действия цены',
  PRIMARY KEY (`id`),
  CONSTRAINT `price_ibfk_1`
    FOREIGN KEY (`work_type_id`)
    REFERENCES `coworking`.`work_types` (`id`)
) ENGINE = InnoDB
AUTO_INCREMENT = 2
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;
CREATE UNIQUE INDEX `unique_worktype_effective` ON `coworking`.`price` (`work_type_id` ASC, `effective_from` ASC) VISIBLE;

SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
