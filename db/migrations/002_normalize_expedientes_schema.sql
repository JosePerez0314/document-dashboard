DROP TABLE IF EXISTS expediente_logs;
DROP TABLE IF EXISTS expedientes;

CREATE TABLE `expedientes` (
  `id` INT PRIMARY KEY AUTO_INCREMENT, -- FIXED: Added Auto-Increment
  `nombre` VARCHAR(255) NOT NULL,
  `status` ENUM('PENDIENTE', 'EN_REVISION', 'CON_OBSERVACIONES', 'CORREGIDO', 'CONFIRMADO') DEFAULT 'PENDIENTE',
  `revisor_id` INT COMMENT 'Foreign Key pointing to users table',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`revisor_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ;

CREATE TABLE `expediente_logs` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `expediente_id` INT NOT NULL, -- FIXED: Changed to INT to match expedientes.id
  `author_id` INT COMMENT 'Who made the change',
  `previous_status` ENUM('PENDIENTE', 'EN_REVISION', 'CON_OBSERVACIONES', 'CORREGIDO', 'CONFIRMADO'),
  `new_status` ENUM('PENDIENTE', 'EN_REVISION', 'CON_OBSERVACIONES', 'CORREGIDO', 'CONFIRMADO') NOT NULL,
  `comentario` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`expediente_id`) REFERENCES `expedientes`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
);