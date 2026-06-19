-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: hotel_fix
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `branches`
--

DROP TABLE IF EXISTS `branches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `branches` (
  `branch_code` varchar(10) NOT NULL,
  PRIMARY KEY (`branch_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branches`
--

LOCK TABLES `branches` WRITE;
/*!40000 ALTER TABLE `branches` DISABLE KEYS */;
INSERT INTO `branches` VALUES ('BB'),('BC'),('BE'),('BM'),('BP'),('BV'),('GB');
/*!40000 ALTER TABLE `branches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `categories` (
  `category_id` int(11) NOT NULL AUTO_INCREMENT,
  `dept_type` varchar(20) NOT NULL,
  `main_th` varchar(100) NOT NULL,
  `main_en` varchar(100) NOT NULL,
  `sub_th` varchar(100) NOT NULL,
  `sub_en` varchar(100) NOT NULL,
  PRIMARY KEY (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,'MAINTENANCE','ระบบปรับอากาศ','Air Conditioning','แอร์, HVAC','AC, HVAC'),(2,'MAINTENANCE','ระบบไฟฟ้า','Electrical','ไฟ, เบรกเกอร์, สายไฟ','Lights, Breaker, Wiring'),(3,'MAINTENANCE','ระบบประปา','Plumbing','น้ำรั่ว, ท่อ, ปั๊มน้ำ','Leaks, Pipes, Pump'),(4,'MAINTENANCE','งานโครงสร้าง','Structural','ผนัง, พื้น, ฝ้าเพดาน','Walls, Floor, Ceiling'),(5,'MAINTENANCE','งานทาสี','Painting','ทาสีภายใน, ภายนอก','Interior, Exterior'),(6,'MAINTENANCE','งานไม้/เฟอร์นิเจอร์','Carpentry/Furniture','ประตู, หน้าต่าง, เตียง','Doors, Windows, Bed'),(7,'MAINTENANCE','ระบบลิฟต์','Elevator','ลิฟต์โดยสาร, ลิฟต์ขนของ','Passenger, Service'),(8,'MAINTENANCE','สระว่ายน้ำ','Swimming Pool','เครื่องกรอง, ระบบคลอรีน','Filter, Chlorine'),(9,'MAINTENANCE','กุญแจ/ระบบล็อค','Locks & Keys','กลอน, แม่กุญแจ, ตู้เซฟ','Bolts, Padlock, Safe'),(10,'MAINTENANCE','งานกระจก','Glass','หน้าต่าง, กระจกเงา, ประตูกระจก','Window, Mirror, Glass Door'),(11,'MAINTENANCE','งานกระเบื้อง/หินอ่อน','Tiling/Marble','ปูกระเบื้อง, หินขัด','Tile, Marble'),(12,'MAINTENANCE','กันซึม/หลังคา','Waterproofing/Roof','รอยรั่ว, ดาดฟ้า','Leak, Rooftop'),(13,'MAINTENANCE','ภูมิทัศน์/สวน','Landscape/Garden','ต้นไม้, สนามหญ้า, ทางเดิน','Trees, Lawn, Path'),(14,'MAINTENANCE','ป้าย/ไฟโฆษณา','Signage/Lighting','ป้ายโรงแรม, ไฟหน้า','Hotel Sign, Facade'),(15,'IT','ระบบเครือข่าย','Network','Internet, LAN, VLAN','Internet, LAN'),(16,'IT','WiFi/อินเทอร์เน็ต','WiFi/Internet','สัญญาณอ่อน, หลุดบ่อย','Weak Signal, Dropouts'),(17,'IT','ระบบโทรศัพท์','Phone System','ตู้สาขา, เครื่องโทรศัพท์','PBX, Handsets'),(18,'IT','คอมพิวเตอร์','Computer','PC, Notebook, จอ','PC, Laptop, Monitor'),(19,'IT','ระบบกล้องวงจรปิด','CCTV','กล้อง, DVR, จอแสดงผล','Camera, DVR, Display'),(20,'IT','ระบบทีวี','TV System','Smart TV, กล่อง, สัญญาณ','Smart TV, Box, Signal'),(21,'IT','ระบบเสียง','Sound System','ลำโพง, ไมค์, ห้องประชุม','Speaker, Mic, Meeting'),(22,'IT','ระบบคีย์การ์ด','Key Card System','เครื่องอ่านบัตร, ซอฟต์แวร์','Reader, Software'),(23,'IT','เครื่องพิมพ์','Printer','Printer, Scanner, ตลับหมึก','Printer, Scanner, Toner'),(24,'IT','ซอฟต์แวร์/PMS','PMS/Software','ระบบจอง, เช็คอิน, POS','Booking, Check-in, POS');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sla_config`
--

DROP TABLE IF EXISTS `sla_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sla_config` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `priority` varchar(10) NOT NULL,
  `sla_minutes` int(11) NOT NULL COMMENT 'Target resolution minutes',
  `description` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `priority` (`priority`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sla_config`
--

LOCK TABLES `sla_config` WRITE;
/*!40000 ALTER TABLE `sla_config` DISABLE KEYS */;
INSERT INTO `sla_config` VALUES (1,'urgent',120,'ด่วนที่สุด - ภายใน 2 ชั่วโมง'),(2,'high',240,'สูง - ภายใน 4 ชั่วโมง'),(3,'medium',480,'ปานกลาง - ภายใน 8 ชั่วโมง'),(4,'low',1440,'ปกติ - ภายใน 24 ชั่วโมง'),(5,'non_urgent',4320,'ไม่เร่งด่วน - ภายใน 72 ชั่วโมง');
/*!40000 ALTER TABLE `sla_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ticket_images`
--

DROP TABLE IF EXISTS `ticket_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ticket_images` (
  `image_id` int(11) NOT NULL AUTO_INCREMENT,
  `ticket_id` int(11) NOT NULL,
  `image_url` varchar(500) NOT NULL,
  `image_type` enum('report','repair','other') DEFAULT 'report',
  `uploaded_by` int(11) NOT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`image_id`),
  KEY `ticket_id` (`ticket_id`),
  KEY `uploaded_by` (`uploaded_by`),
  CONSTRAINT `ticket_images_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`ticket_id`) ON DELETE CASCADE,
  CONSTRAINT `ticket_images_ibfk_2` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ticket_images`
--

LOCK TABLES `ticket_images` WRITE;
/*!40000 ALTER TABLE `ticket_images` DISABLE KEYS */;
/*!40000 ALTER TABLE `ticket_images` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tickets`
--

DROP TABLE IF EXISTS `tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tickets` (
  `ticket_id` int(11) NOT NULL AUTO_INCREMENT,
  `ticket_number` varchar(30) DEFAULT NULL,
  `branch_code` varchar(10) DEFAULT NULL,
  `category_id` int(11) DEFAULT NULL,
  `reporter_id` int(11) DEFAULT NULL,
  `reporter_department` varchar(20) DEFAULT NULL,
  `technician_id` int(11) DEFAULT NULL,
  `accepted_by` int(11) DEFAULT NULL,
  `resolved_by` int(11) DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `location_detail` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `priority` varchar(10) DEFAULT 'medium',
  `difficulty` varchar(10) DEFAULT 'medium',
  `status` varchar(20) DEFAULT 'PENDING',
  `pending_reason` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `accepted_at` datetime DEFAULT NULL,
  `resolved_at` datetime DEFAULT NULL,
  `sla_deadline` datetime DEFAULT NULL,
  `sla_minutes` int(11) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `kpi_rating` int(11) DEFAULT NULL,
  PRIMARY KEY (`ticket_id`),
  UNIQUE KEY `ticket_number` (`ticket_number`),
  KEY `branch_code` (`branch_code`),
  KEY `category_id` (`category_id`),
  KEY `reporter_id` (`reporter_id`),
  CONSTRAINT `tickets_ibfk_1` FOREIGN KEY (`branch_code`) REFERENCES `branches` (`branch_code`),
  CONSTRAINT `tickets_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`),
  CONSTRAINT `tickets_ibfk_3` FOREIGN KEY (`reporter_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=90 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tickets`
--

LOCK TABLES `tickets` WRITE;
/*!40000 ALTER TABLE `tickets` DISABLE KEYS */;
INSERT INTO `tickets` VALUES (1,'BV-EN-2026-06-00001','BV',1,1,'MAINTENANCE',NULL,NULL,NULL,NULL,'ห้อง 101','แอร์ไม่เย็น','urgent',NULL,'PENDING',NULL,'2026-06-12 13:11:57',NULL,NULL,'2026-06-13 00:41:57',NULL,NULL,NULL),(2,'BV-EN-2026-06-00002','BV',2,1,'IT',NULL,NULL,NULL,NULL,'ห้อง 202','ไฟกระพริบ','high',NULL,'PENDING',NULL,'2026-06-12 12:11:57',NULL,NULL,'2026-06-12 23:41:57',NULL,NULL,NULL),(3,'BV-EN-2026-06-00003','BV',3,1,'HK',NULL,NULL,NULL,NULL,'ล็อบบี้','น้ำรั่ว','medium',NULL,'PENDING',NULL,'2026-06-12 11:11:57',NULL,NULL,'2026-06-12 22:41:57',NULL,NULL,NULL),(4,'BV-EN-2026-06-00004','BV',4,1,'FO',10,10,NULL,NULL,'ห้องอาหาร','WiFi ล่ม','low',NULL,'IN_PROGRESS',NULL,'2026-06-12 10:11:57','2026-06-12 17:41:57',NULL,'2026-06-12 21:41:57',NULL,NULL,NULL),(5,'BV-EN-2026-06-00005','BV',5,1,'FB',10,10,NULL,NULL,'สระว่ายน้ำ','ประตูปิดไม่สนิท','non_urgent',NULL,'IN_PROGRESS',NULL,'2026-06-12 09:11:57','2026-06-12 16:41:57',NULL,'2026-06-12 20:41:57',NULL,NULL,NULL),(6,'BV-EN-2026-06-00006','BV',6,1,'ACC',10,10,10,NULL,'ห้องประชุม','กล้องวงจรปิดเสีย','urgent',NULL,'RESOLVED',NULL,'2026-06-12 08:11:57','2026-06-12 15:41:57','2026-06-12 17:11:57','2026-06-12 19:41:57',90,NULL,NULL),(7,'BV-EN-2026-06-00007','BV',7,1,'MK',10,10,10,NULL,'ทางเดิน','กระจกแตก','high',NULL,'RESOLVED',NULL,'2026-06-12 07:11:57','2026-06-12 14:41:57','2026-06-12 16:11:57','2026-06-12 18:41:57',90,NULL,NULL),(8,'BV-IT-2026-06-00001','BV',22,1,'GE',10,10,10,12,'ครัว','ทีวีไม่มีสัญญาณ','medium','very_hard','APPROVED',NULL,'2026-06-12 06:11:57','2026-06-12 13:41:57','2026-06-12 15:11:57','2026-06-12 17:41:57',90,'2026-06-12 15:41:57',5),(9,'BV-IT-2026-06-00002','BV',23,1,'GM',10,10,10,12,'ดาดฟ้า','หลังคารั่ว','low','easy','APPROVED',NULL,'2026-06-12 05:11:57','2026-06-12 12:41:57','2026-06-12 14:11:57','2026-06-12 16:41:57',90,'2026-06-12 14:41:57',NULL),(10,'BV-IT-2026-06-00003','BV',24,1,'MAINTENANCE',10,10,10,NULL,'ห้อง 305','เสียงหลุดในห้องประชุม','non_urgent',NULL,'PENDING','หัวหน้าตีกลับ: งานยังไม่เรียบร้อย กรุณาตรวจสอบใหม่','2026-06-12 04:11:57','2026-06-12 11:41:57','2026-06-12 13:11:57','2026-06-12 15:41:57',90,NULL,NULL),(11,'BV-EN-2026-06-00008','BV',11,1,'IT',10,10,NULL,NULL,'ห้อง 101','แอร์ไม่เย็น','urgent',NULL,'PENDING','ผู้แจ้งแจ้ง: งานยังไม่เรียบร้อย','2026-06-12 03:11:57','2026-06-12 10:41:57',NULL,'2026-06-12 14:41:57',NULL,NULL,NULL),(12,'BV-EN-2026-06-00009','BV',12,1,'HK',NULL,NULL,NULL,NULL,'ห้อง 202','ไฟกระพริบ','high',NULL,'PENDING',NULL,'2026-06-12 02:11:57',NULL,NULL,'2026-06-12 13:41:57',NULL,NULL,NULL),(13,'BP-EN-2026-06-00001','BP',13,1,'MAINTENANCE',NULL,NULL,NULL,NULL,'ห้อง 202','ไฟกระพริบ','high',NULL,'PENDING',NULL,'2026-06-13 13:11:57',NULL,NULL,'2026-06-14 00:41:57',NULL,NULL,NULL),(14,'BP-EN-2026-06-00002','BP',14,1,'IT',NULL,NULL,NULL,NULL,'ล็อบบี้','น้ำรั่ว','medium',NULL,'PENDING',NULL,'2026-06-13 12:11:57',NULL,NULL,'2026-06-13 23:41:57',NULL,NULL,NULL),(15,'BP-EN-2026-06-00003','BP',1,1,'HK',NULL,NULL,NULL,NULL,'ห้องอาหาร','WiFi ล่ม','low',NULL,'PENDING',NULL,'2026-06-13 11:11:57',NULL,NULL,'2026-06-13 22:41:57',NULL,NULL,NULL),(16,'BP-EN-2026-06-00004','BP',2,1,'FO',10,10,NULL,NULL,'สระว่ายน้ำ','ประตูปิดไม่สนิท','non_urgent',NULL,'IN_PROGRESS',NULL,'2026-06-13 10:11:57','2026-06-13 17:41:57',NULL,'2026-06-13 21:41:57',NULL,NULL,NULL),(17,'BP-EN-2026-06-00005','BP',3,1,'FB',10,10,NULL,NULL,'ห้องประชุม','กล้องวงจรปิดเสีย','urgent',NULL,'IN_PROGRESS',NULL,'2026-06-13 09:11:57','2026-06-13 16:41:57',NULL,'2026-06-13 20:41:57',NULL,NULL,NULL),(18,'BP-EN-2026-06-00006','BP',4,1,'ACC',10,10,10,NULL,'ทางเดิน','กระจกแตก','high',NULL,'RESOLVED',NULL,'2026-06-13 08:11:57','2026-06-13 15:41:57','2026-06-13 17:11:57','2026-06-13 19:41:57',90,NULL,NULL),(19,'BP-IT-2026-06-00001','BP',23,1,'MK',10,10,10,NULL,'ครัว','ทีวีไม่มีสัญญาณ','medium',NULL,'RESOLVED',NULL,'2026-06-13 07:11:57','2026-06-13 14:41:57','2026-06-13 16:11:57','2026-06-13 18:41:57',90,NULL,NULL),(20,'BP-IT-2026-06-00002','BP',24,1,'GE',10,10,10,12,'ดาดฟ้า','หลังคารั่ว','low','easy','APPROVED',NULL,'2026-06-13 06:11:57','2026-06-13 13:41:57','2026-06-13 15:11:57','2026-06-13 17:41:57',90,'2026-06-13 15:41:57',3),(21,'BP-IT-2026-06-00003','BP',15,1,'GM',10,10,10,12,'ห้อง 305','เสียงหลุดในห้องประชุม','non_urgent','medium','APPROVED',NULL,'2026-06-13 05:11:57','2026-06-13 12:41:57','2026-06-13 14:11:57','2026-06-13 16:41:57',90,'2026-06-13 14:41:57',NULL),(22,'BP-EN-2026-06-00007','BP',8,1,'MAINTENANCE',10,10,10,NULL,'ห้อง 101','แอร์ไม่เย็น','urgent',NULL,'PENDING','หัวหน้าตีกลับ: งานยังไม่เรียบร้อย กรุณาตรวจสอบใหม่','2026-06-13 04:11:57','2026-06-13 11:41:57','2026-06-13 13:11:57','2026-06-13 15:41:57',90,NULL,NULL),(23,'BP-EN-2026-06-00008','BP',9,1,'IT',10,10,NULL,NULL,'ห้อง 202','ไฟกระพริบ','high',NULL,'PENDING','ผู้แจ้งแจ้ง: งานยังไม่เรียบร้อย','2026-06-13 03:11:57','2026-06-13 10:41:57',NULL,'2026-06-13 14:41:57',NULL,NULL,NULL),(24,'BP-EN-2026-06-00009','BP',10,1,'HK',NULL,NULL,NULL,NULL,'ล็อบบี้','น้ำรั่ว','medium',NULL,'PENDING',NULL,'2026-06-13 02:11:57',NULL,NULL,'2026-06-13 13:41:57',NULL,NULL,NULL),(25,'BC-EN-2026-06-00001','BC',11,1,'MAINTENANCE',NULL,NULL,NULL,NULL,'ล็อบบี้','น้ำรั่ว','medium',NULL,'PENDING',NULL,'2026-06-14 13:11:57',NULL,NULL,'2026-06-15 00:41:57',NULL,NULL,NULL),(26,'BC-EN-2026-06-00002','BC',12,1,'IT',NULL,NULL,NULL,NULL,'ห้องอาหาร','WiFi ล่ม','low',NULL,'PENDING',NULL,'2026-06-14 12:11:57',NULL,NULL,'2026-06-14 23:41:57',NULL,NULL,NULL),(27,'BC-EN-2026-06-00003','BC',13,1,'HK',NULL,NULL,NULL,NULL,'สระว่ายน้ำ','ประตูปิดไม่สนิท','non_urgent',NULL,'PENDING',NULL,'2026-06-14 11:11:57',NULL,NULL,'2026-06-14 22:41:57',NULL,NULL,NULL),(28,'BC-EN-2026-06-00004','BC',14,1,'FO',10,10,NULL,NULL,'ห้องประชุม','กล้องวงจรปิดเสีย','urgent',NULL,'IN_PROGRESS',NULL,'2026-06-14 10:11:57','2026-06-14 17:41:57',NULL,'2026-06-14 21:41:57',NULL,NULL,NULL),(29,'BC-EN-2026-06-00005','BC',1,1,'FB',10,10,NULL,NULL,'ทางเดิน','กระจกแตก','high',NULL,'IN_PROGRESS',NULL,'2026-06-14 09:11:57','2026-06-14 16:41:57',NULL,'2026-06-14 20:41:57',NULL,NULL,NULL),(30,'BC-IT-2026-06-00001','BC',24,1,'ACC',10,10,10,NULL,'ครัว','ทีวีไม่มีสัญญาณ','medium',NULL,'RESOLVED',NULL,'2026-06-14 08:11:57','2026-06-14 15:41:57','2026-06-14 17:11:57','2026-06-14 19:41:57',90,NULL,NULL),(31,'BC-IT-2026-06-00002','BC',15,1,'MK',10,10,10,NULL,'ดาดฟ้า','หลังคารั่ว','low',NULL,'RESOLVED',NULL,'2026-06-14 07:11:57','2026-06-14 14:41:57','2026-06-14 16:11:57','2026-06-14 18:41:57',90,NULL,NULL),(32,'BC-IT-2026-06-00003','BC',16,1,'GE',10,10,10,12,'ห้อง 305','เสียงหลุดในห้องประชุม','non_urgent','medium','APPROVED',NULL,'2026-06-14 06:11:57','2026-06-14 13:41:57','2026-06-14 15:11:57','2026-06-14 17:41:57',90,'2026-06-14 15:41:57',4),(33,'BC-EN-2026-06-00006','BC',5,1,'GM',10,10,10,12,'ห้อง 101','แอร์ไม่เย็น','urgent','hard','APPROVED',NULL,'2026-06-14 05:11:57','2026-06-14 12:41:57','2026-06-14 14:11:57','2026-06-14 16:41:57',90,'2026-06-14 14:41:57',NULL),(34,'BC-EN-2026-06-00007','BC',6,1,'MAINTENANCE',10,10,10,NULL,'ห้อง 202','ไฟกระพริบ','high',NULL,'PENDING','หัวหน้าตีกลับ: งานยังไม่เรียบร้อย กรุณาตรวจสอบใหม่','2026-06-14 04:11:57','2026-06-14 11:41:57','2026-06-14 13:11:57','2026-06-14 15:41:57',90,NULL,NULL),(35,'BC-EN-2026-06-00008','BC',7,1,'IT',10,10,NULL,NULL,'ล็อบบี้','น้ำรั่ว','medium',NULL,'PENDING','ผู้แจ้งแจ้ง: งานยังไม่เรียบร้อย','2026-06-14 03:11:57','2026-06-14 10:41:57',NULL,'2026-06-14 14:41:57',NULL,NULL,NULL),(36,'BC-EN-2026-06-00009','BC',8,1,'HK',NULL,NULL,NULL,NULL,'ห้องอาหาร','WiFi ล่ม','low',NULL,'PENDING',NULL,'2026-06-14 02:11:57',NULL,NULL,'2026-06-14 13:41:57',NULL,NULL,NULL),(37,'BM-EN-2026-06-00001','BM',9,1,'MAINTENANCE',NULL,NULL,NULL,NULL,'ห้องอาหาร','WiFi ล่ม','low',NULL,'PENDING',NULL,'2026-06-15 13:11:57',NULL,NULL,'2026-06-16 00:41:57',NULL,NULL,NULL),(38,'BM-EN-2026-06-00002','BM',10,1,'IT',NULL,NULL,NULL,NULL,'สระว่ายน้ำ','ประตูปิดไม่สนิท','non_urgent',NULL,'PENDING',NULL,'2026-06-15 12:11:57',NULL,NULL,'2026-06-15 23:41:57',NULL,NULL,NULL),(39,'BM-EN-2026-06-00003','BM',11,1,'HK',NULL,NULL,NULL,NULL,'ห้องประชุม','กล้องวงจรปิดเสีย','urgent',NULL,'PENDING',NULL,'2026-06-15 11:11:57',NULL,NULL,'2026-06-15 22:41:57',NULL,NULL,NULL),(40,'BM-EN-2026-06-00004','BM',12,1,'FO',10,10,NULL,NULL,'ทางเดิน','กระจกแตก','high',NULL,'IN_PROGRESS',NULL,'2026-06-15 10:11:57','2026-06-15 17:41:57',NULL,'2026-06-15 21:41:57',NULL,NULL,NULL),(41,'BM-IT-2026-06-00001','BM',15,1,'FB',10,10,NULL,NULL,'ครัว','ทีวีไม่มีสัญญาณ','medium',NULL,'IN_PROGRESS',NULL,'2026-06-15 09:11:57','2026-06-15 16:41:57',NULL,'2026-06-15 20:41:57',NULL,NULL,NULL),(42,'BM-IT-2026-06-00002','BM',16,1,'ACC',10,10,10,NULL,'ดาดฟ้า','หลังคารั่ว','low',NULL,'RESOLVED',NULL,'2026-06-15 08:11:57','2026-06-15 15:41:57','2026-06-15 17:11:57','2026-06-15 19:41:57',90,NULL,NULL),(43,'BM-IT-2026-06-00003','BM',17,1,'MK',10,10,10,NULL,'ห้อง 305','เสียงหลุดในห้องประชุม','non_urgent',NULL,'RESOLVED',NULL,'2026-06-15 07:11:57','2026-06-15 14:41:57','2026-06-15 16:11:57','2026-06-15 18:41:57',90,NULL,NULL),(44,'BM-EN-2026-06-00005','BM',2,1,'GE',10,10,10,12,'ห้อง 101','แอร์ไม่เย็น','urgent','hard','APPROVED',NULL,'2026-06-15 06:11:57','2026-06-15 13:41:57','2026-06-15 15:11:57','2026-06-15 17:41:57',90,'2026-06-15 15:41:57',5),(45,'BM-EN-2026-06-00006','BM',3,1,'GM',10,10,10,12,'ห้อง 202','ไฟกระพริบ','high','very_hard','APPROVED',NULL,'2026-06-15 05:11:57','2026-06-15 12:41:57','2026-06-15 14:11:57','2026-06-15 16:41:57',90,'2026-06-15 14:41:57',NULL),(46,'BM-EN-2026-06-00007','BM',4,1,'MAINTENANCE',10,10,10,NULL,'ล็อบบี้','น้ำรั่ว','medium',NULL,'PENDING','หัวหน้าตีกลับ: งานยังไม่เรียบร้อย กรุณาตรวจสอบใหม่','2026-06-15 04:11:57','2026-06-15 11:41:57','2026-06-15 13:11:57','2026-06-15 15:41:57',90,NULL,NULL),(47,'BM-EN-2026-06-00008','BM',5,1,'IT',10,10,NULL,NULL,'ห้องอาหาร','WiFi ล่ม','low',NULL,'PENDING','ผู้แจ้งแจ้ง: งานยังไม่เรียบร้อย','2026-06-15 03:11:57','2026-06-15 10:41:57',NULL,'2026-06-15 14:41:57',NULL,NULL,NULL),(48,'BM-EN-2026-06-00009','BM',6,1,'HK',NULL,NULL,NULL,NULL,'สระว่ายน้ำ','ประตูปิดไม่สนิท','non_urgent',NULL,'PENDING',NULL,'2026-06-15 02:11:57',NULL,NULL,'2026-06-15 13:41:57',NULL,NULL,NULL),(49,'BB-EN-2026-06-00001','BB',7,1,'MAINTENANCE',NULL,NULL,NULL,NULL,'สระว่ายน้ำ','ประตูปิดไม่สนิท','non_urgent',NULL,'PENDING',NULL,'2026-06-16 13:11:57',NULL,NULL,'2026-06-17 00:41:57',NULL,NULL,NULL),(50,'BB-EN-2026-06-00002','BB',8,1,'IT',NULL,NULL,NULL,NULL,'ห้องประชุม','กล้องวงจรปิดเสีย','urgent',NULL,'PENDING',NULL,'2026-06-16 12:11:57',NULL,NULL,'2026-06-16 23:41:57',NULL,NULL,NULL),(51,'BB-EN-2026-06-00003','BB',9,1,'HK',NULL,NULL,NULL,NULL,'ทางเดิน','กระจกแตก','high',NULL,'PENDING',NULL,'2026-06-16 11:11:57',NULL,NULL,'2026-06-16 22:41:57',NULL,NULL,NULL),(52,'BB-IT-2026-06-00001','BB',16,1,'FO',10,10,NULL,NULL,'ครัว','ทีวีไม่มีสัญญาณ','medium',NULL,'IN_PROGRESS',NULL,'2026-06-16 10:11:57','2026-06-16 17:41:57',NULL,'2026-06-16 21:41:57',NULL,NULL,NULL),(53,'BB-IT-2026-06-00002','BB',17,1,'FB',10,10,NULL,NULL,'ดาดฟ้า','หลังคารั่ว','low',NULL,'IN_PROGRESS',NULL,'2026-06-16 09:11:57','2026-06-16 16:41:57',NULL,'2026-06-16 20:41:57',NULL,NULL,NULL),(54,'BB-IT-2026-06-00003','BB',18,1,'ACC',10,10,10,NULL,'ห้อง 305','เสียงหลุดในห้องประชุม','non_urgent',NULL,'RESOLVED',NULL,'2026-06-16 08:11:57','2026-06-16 15:41:57','2026-06-16 17:11:57','2026-06-16 19:41:57',90,NULL,NULL),(55,'BB-EN-2026-06-00004','BB',13,1,'MK',10,10,10,NULL,'ห้อง 101','แอร์ไม่เย็น','urgent',NULL,'RESOLVED',NULL,'2026-06-16 07:11:57','2026-06-16 14:41:57','2026-06-16 16:11:57','2026-06-16 18:41:57',90,NULL,NULL),(56,'BB-EN-2026-06-00005','BB',14,1,'GE',10,10,10,12,'ห้อง 202','ไฟกระพริบ','high','very_hard','APPROVED',NULL,'2026-06-16 06:11:57','2026-06-16 13:41:57','2026-06-16 15:11:57','2026-06-16 17:41:57',90,'2026-06-16 15:41:57',4),(57,'BB-EN-2026-06-00006','BB',1,1,'GM',10,10,10,12,'ล็อบบี้','น้ำรั่ว','medium','easy','APPROVED',NULL,'2026-06-16 05:11:57','2026-06-16 12:41:57','2026-06-16 14:11:57','2026-06-16 16:41:57',90,'2026-06-16 14:41:57',NULL),(58,'BB-EN-2026-06-00007','BB',2,1,'MAINTENANCE',10,10,10,NULL,'ห้องอาหาร','WiFi ล่ม','low',NULL,'PENDING','หัวหน้าตีกลับ: งานยังไม่เรียบร้อย กรุณาตรวจสอบใหม่','2026-06-16 04:11:57','2026-06-16 11:41:57','2026-06-16 13:11:57','2026-06-16 15:41:57',90,NULL,NULL),(59,'BB-EN-2026-06-00008','BB',3,1,'IT',10,10,NULL,NULL,'สระว่ายน้ำ','ประตูปิดไม่สนิท','non_urgent',NULL,'PENDING','ผู้แจ้งแจ้ง: งานยังไม่เรียบร้อย','2026-06-16 03:11:57','2026-06-16 10:41:57',NULL,'2026-06-16 14:41:57',NULL,NULL,NULL),(60,'BB-EN-2026-06-00009','BB',4,1,'HK',NULL,NULL,NULL,NULL,'ห้องประชุม','กล้องวงจรปิดเสีย','urgent',NULL,'PENDING',NULL,'2026-06-16 02:11:57',NULL,NULL,'2026-06-16 13:41:57',NULL,NULL,NULL),(61,'BE-EN-2026-06-00001','BE',5,1,'MAINTENANCE',NULL,NULL,NULL,NULL,'ห้องประชุม','กล้องวงจรปิดเสีย','urgent',NULL,'PENDING',NULL,'2026-06-17 13:11:57',NULL,NULL,'2026-06-18 00:41:57',NULL,NULL,NULL),(62,'BE-EN-2026-06-00002','BE',6,1,'IT',NULL,NULL,NULL,NULL,'ทางเดิน','กระจกแตก','high',NULL,'PENDING',NULL,'2026-06-17 12:11:57',NULL,NULL,'2026-06-17 23:41:57',NULL,NULL,NULL),(63,'BE-IT-2026-06-00001','BE',17,1,'HK',NULL,NULL,NULL,NULL,'ครัว','ทีวีไม่มีสัญญาณ','medium',NULL,'PENDING',NULL,'2026-06-17 11:11:57',NULL,NULL,'2026-06-17 22:41:57',NULL,NULL,NULL),(64,'BE-IT-2026-06-00002','BE',18,1,'FO',10,10,NULL,NULL,'ดาดฟ้า','หลังคารั่ว','low',NULL,'IN_PROGRESS',NULL,'2026-06-17 10:11:57','2026-06-17 17:41:57',NULL,'2026-06-17 21:41:57',NULL,NULL,NULL),(65,'BE-IT-2026-06-00003','BE',19,1,'FB',10,10,NULL,NULL,'ห้อง 305','เสียงหลุดในห้องประชุม','non_urgent',NULL,'IN_PROGRESS',NULL,'2026-06-17 09:11:57','2026-06-17 16:41:57',NULL,'2026-06-17 20:41:57',NULL,NULL,NULL),(66,'BE-EN-2026-06-00003','BE',10,1,'ACC',10,10,10,NULL,'ห้อง 101','แอร์ไม่เย็น','urgent',NULL,'RESOLVED',NULL,'2026-06-17 08:11:57','2026-06-17 15:41:57','2026-06-17 17:11:57','2026-06-17 19:41:57',90,NULL,NULL),(67,'BE-EN-2026-06-00004','BE',11,1,'MK',10,10,10,NULL,'ห้อง 202','ไฟกระพริบ','high',NULL,'RESOLVED',NULL,'2026-06-17 07:11:57','2026-06-17 14:41:57','2026-06-17 16:11:57','2026-06-17 18:41:57',90,NULL,NULL),(68,'BE-EN-2026-06-00005','BE',12,1,'GE',10,10,10,12,'ล็อบบี้','น้ำรั่ว','medium','easy','APPROVED',NULL,'2026-06-17 06:11:57','2026-06-17 13:41:57','2026-06-17 15:11:57','2026-06-17 17:41:57',90,'2026-06-17 15:41:57',5),(69,'BE-EN-2026-06-00006','BE',13,1,'GM',10,10,10,12,'ห้องอาหาร','WiFi ล่ม','low','medium','APPROVED',NULL,'2026-06-17 05:11:57','2026-06-17 12:41:57','2026-06-17 14:11:57','2026-06-17 16:41:57',90,'2026-06-17 14:41:57',NULL),(70,'BE-EN-2026-06-00007','BE',14,1,'MAINTENANCE',10,10,10,NULL,'สระว่ายน้ำ','ประตูปิดไม่สนิท','non_urgent',NULL,'PENDING','หัวหน้าตีกลับ: งานยังไม่เรียบร้อย กรุณาตรวจสอบใหม่','2026-06-17 04:11:57','2026-06-17 11:41:57','2026-06-17 13:11:57','2026-06-17 15:41:57',90,NULL,NULL),(71,'BE-EN-2026-06-00008','BE',1,1,'IT',10,10,NULL,NULL,'ห้องประชุม','กล้องวงจรปิดเสีย','urgent',NULL,'PENDING','ผู้แจ้งแจ้ง: งานยังไม่เรียบร้อย','2026-06-17 03:11:57','2026-06-17 10:41:57',NULL,'2026-06-17 14:41:57',NULL,NULL,NULL),(72,'BE-EN-2026-06-00009','BE',2,1,'HK',NULL,NULL,NULL,NULL,'ทางเดิน','กระจกแตก','high',NULL,'PENDING',NULL,'2026-06-17 02:11:57',NULL,NULL,'2026-06-17 13:41:57',NULL,NULL,NULL),(73,'GB-EN-2026-06-00001','GB',3,1,'MAINTENANCE',NULL,NULL,NULL,NULL,'ทางเดิน','กระจกแตก','high',NULL,'PENDING',NULL,'2026-06-18 13:11:57',NULL,NULL,'2026-06-19 00:41:57',NULL,NULL,NULL),(74,'GB-IT-2026-06-00001','GB',18,1,'IT',NULL,NULL,NULL,NULL,'ครัว','ทีวีไม่มีสัญญาณ','medium',NULL,'PENDING',NULL,'2026-06-18 12:11:57',NULL,NULL,'2026-06-18 23:41:57',NULL,NULL,NULL),(75,'GB-IT-2026-06-00002','GB',19,1,'HK',NULL,NULL,NULL,NULL,'ดาดฟ้า','หลังคารั่ว','low',NULL,'PENDING',NULL,'2026-06-18 11:11:57',NULL,NULL,'2026-06-18 22:41:57',NULL,NULL,NULL),(76,'GB-IT-2026-06-00003','GB',20,1,'FO',10,10,NULL,NULL,'ห้อง 305','เสียงหลุดในห้องประชุม','non_urgent',NULL,'IN_PROGRESS',NULL,'2026-06-18 10:11:57','2026-06-18 17:41:57',NULL,'2026-06-18 21:41:57',NULL,NULL,NULL),(77,'GB-EN-2026-06-00002','GB',7,1,'FB',10,10,NULL,NULL,'ห้อง 101','แอร์ไม่เย็น','urgent',NULL,'IN_PROGRESS',NULL,'2026-06-18 09:11:57','2026-06-18 16:41:57',NULL,'2026-06-18 20:41:57',NULL,NULL,NULL),(78,'GB-EN-2026-06-00003','GB',8,1,'ACC',10,10,10,NULL,'ห้อง 202','ไฟกระพริบ','high',NULL,'RESOLVED',NULL,'2026-06-18 08:11:57','2026-06-18 15:41:57','2026-06-18 17:11:57','2026-06-18 19:41:57',90,NULL,NULL),(79,'GB-EN-2026-06-00004','GB',9,1,'MK',10,10,10,NULL,'ล็อบบี้','น้ำรั่ว','medium',NULL,'RESOLVED',NULL,'2026-06-18 07:11:57','2026-06-18 14:41:57','2026-06-18 16:11:57','2026-06-18 18:41:57',90,NULL,NULL),(80,'GB-EN-2026-06-00005','GB',10,1,'GE',10,10,10,12,'ห้องอาหาร','WiFi ล่ม','low','medium','APPROVED',NULL,'2026-06-18 06:11:57','2026-06-18 13:41:57','2026-06-18 15:11:57','2026-06-18 17:41:57',90,'2026-06-18 15:41:57',3),(81,'GB-EN-2026-06-00006','GB',11,1,'GM',10,10,10,12,'สระว่ายน้ำ','ประตูปิดไม่สนิท','non_urgent','hard','APPROVED',NULL,'2026-06-18 05:11:57','2026-06-18 12:41:57','2026-06-18 14:11:57','2026-06-18 16:41:57',90,'2026-06-18 14:41:57',NULL),(82,'GB-EN-2026-06-00007','GB',12,1,'MAINTENANCE',10,10,10,NULL,'ห้องประชุม','กล้องวงจรปิดเสีย','urgent',NULL,'PENDING','หัวหน้าตีกลับ: งานยังไม่เรียบร้อย กรุณาตรวจสอบใหม่','2026-06-18 04:11:57','2026-06-18 11:41:57','2026-06-18 13:11:57','2026-06-18 15:41:57',90,NULL,NULL),(83,'GB-EN-2026-06-00008','GB',13,1,'IT',10,10,NULL,NULL,'ทางเดิน','กระจกแตก','high',NULL,'PENDING','ผู้แจ้งแจ้ง: งานยังไม่เรียบร้อย','2026-06-18 03:11:57','2026-06-18 10:41:57',NULL,'2026-06-18 14:41:57',NULL,NULL,NULL),(84,'GB-IT-2026-06-00004','GB',18,1,'HK',NULL,NULL,NULL,NULL,'ครัว','ทีวีไม่มีสัญญาณ','medium',NULL,'PENDING',NULL,'2026-06-18 02:11:57',NULL,NULL,'2026-06-18 13:41:57',NULL,NULL,NULL),(85,'BV-IT-2026-06-00004','BV',24,8,'IT',NULL,NULL,NULL,NULL,'com front 1','เข้าใช้งานไม่ได้ ','medium','medium','PENDING',NULL,'2026-06-19 13:24:34',NULL,NULL,'2026-06-20 04:24:34',NULL,NULL,NULL),(86,'BV-EN-2026-06-00010','BV',1,15,'HK',NULL,NULL,NULL,NULL,'???? 301','??????????? ????????','high','medium','PENDING',NULL,'2026-06-19 13:31:33',NULL,NULL,'2026-06-20 00:31:33',NULL,NULL,NULL),(87,'BV-IT-2026-06-00005','BV',15,8,'IT',NULL,NULL,NULL,NULL,'302','เน๊ตใช้ไม่ได้','high','medium','PENDING',NULL,'2026-06-19 13:33:28',NULL,NULL,'2026-06-20 00:33:28',NULL,NULL,NULL),(88,'BV-EN-2026-06-00011','BV',1,15,'HK',NULL,NULL,NULL,NULL,'Room 501','Test AC broken','high','medium','PENDING',NULL,'2026-06-19 13:37:02',NULL,NULL,'2026-06-20 00:37:02',NULL,NULL,NULL),(89,'BP-IT-2026-06-00004','BP',15,15,'IT',NULL,NULL,NULL,NULL,'550','ใช้งานไม่ได้ ','medium','medium','PENDING',NULL,'2026-06-19 14:17:14',NULL,NULL,'2026-06-20 05:17:14',NULL,NULL,NULL);
/*!40000 ALTER TABLE `tickets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_branches`
--

DROP TABLE IF EXISTS `user_branches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_branches` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `branch_code` varchar(10) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_branch` (`user_id`,`branch_code`),
  CONSTRAINT `user_branches_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_branches`
--

LOCK TABLES `user_branches` WRITE;
/*!40000 ALTER TABLE `user_branches` DISABLE KEYS */;
INSERT INTO `user_branches` VALUES (35,1,'BV'),(3,2,'BP'),(4,3,'BP'),(1,4,'BC'),(2,5,'BC'),(6,6,'BV'),(7,7,'BV'),(33,8,'BV'),(34,9,'BV'),(8,10,'BV'),(9,11,'BV'),(10,12,'BV'),(11,13,'BV'),(20,14,'BB'),(18,14,'BC'),(21,14,'BE'),(19,14,'BM'),(17,14,'BP'),(16,14,'BV'),(22,14,'GB'),(27,15,'BB'),(25,15,'BC'),(28,15,'BE'),(26,15,'BM'),(24,15,'BP'),(23,15,'BV'),(29,15,'GB'),(32,16,'BV');
/*!40000 ALTER TABLE `user_branches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `password_reset_required` tinyint(1) DEFAULT 0,
  `full_name` varchar(100) NOT NULL,
  `role` varchar(20) NOT NULL,
  `department` varchar(20) DEFAULT NULL,
  `branch_code` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`),
  KEY `branch_code` (`branch_code`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`branch_code`) REFERENCES `branches` (`branch_code`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'frontbv','123456',0,'สมศรี ฟรอนท์ BV','front',NULL,'BV'),(2,'maid_bp','123456',0,'แม่บ้านสมใจ BP','REPORTER',NULL,'BP'),(3,'tech_bp','123456',0,'ช่างสมศักดิ์ BP','TECHNICIAN',NULL,'BP'),(4,'kitchen_bc','123456',0,'เชฟเชาว์ ครัว BC','REPORTER',NULL,'BC'),(5,'it_bc','123456',0,'ไอทีพงษ์ BC','IT_SUPPORT',NULL,'BC'),(6,'head_maint_big','123456',0,'หัวหน้าช่างใหญ่ ส่วนกลาง','HEAD_MAINT',NULL,'BV'),(7,'head_it_big','123456',0,'หัวหน้าไอทีใหญ่ ส่วนกลาง','HEAD_IT',NULL,'BV'),(8,'front1','$2a$10$5Z9NAVRnF6aCGkl5NVE2Pe3dZc/6Jey2naJzPcoOOIvjR4nzDACAa',0,'พนักงานฟรอนต์','front',NULL,'BV'),(9,'house1','$2a$10$fM3D9.Dii5cVromJhTFM4utpgt0f3310FDLGmyZDir6QtIN5CoxIO',0,'แม่บ้าน','house',NULL,'BV'),(10,'tech1','$2a$10$fM3D9.Dii5cVromJhTFM4utpgt0f3310FDLGmyZDir6QtIN5CoxIO',0,'ช่างเทคนิค','tech',NULL,'BV'),(11,'it1','$2a$10$fM3D9.Dii5cVromJhTFM4utpgt0f3310FDLGmyZDir6QtIN5CoxIO',0,'ช่างไอที','it',NULL,'BV'),(12,'sup1','$2a$10$fM3D9.Dii5cVromJhTFM4utpgt0f3310FDLGmyZDir6QtIN5CoxIO',0,'หัวหน้าช่าง','sup',NULL,'BV'),(13,'supit1','$2a$10$fM3D9.Dii5cVromJhTFM4utpgt0f3310FDLGmyZDir6QtIN5CoxIO',0,'หัวหน้าไอที','supit',NULL,'BV'),(14,'gm1','$2a$10$fM3D9.Dii5cVromJhTFM4utpgt0f3310FDLGmyZDir6QtIN5CoxIO',0,'ผู้จัดการทั่วไป','gm',NULL,NULL),(15,'admin','$2a$10$fM3D9.Dii5cVromJhTFM4utpgt0f3310FDLGmyZDir6QtIN5CoxIO',0,'ผู้ดูแลระบบ','admin',NULL,NULL),(16,'testuser1','$2a$10$ZUhuTPdGpFbEAUj90Q8gLeQ9I0HGat22vXJa9zWfHsuzUOB.OzYtO',1,'????? ??????','front','front','BV');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-19 22:04:43
