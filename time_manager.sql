-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Waktu pembuatan: 09 Jun 2026 pada 14.34
-- Versi server: 10.4.32-MariaDB
-- Versi PHP: 8.3.29

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `time_manager`
--

-- --------------------------------------------------------

--
-- Struktur dari tabel `event_logs`
--

CREATE TABLE `event_logs` (
  `id` varchar(36) NOT NULL,
  `room_id` varchar(20) NOT NULL,
  `timer_id` varchar(36) DEFAULT NULL,
  `event` varchar(64) NOT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `timestamp` bigint(20) NOT NULL,
  `operator_id` varchar(64) NOT NULL DEFAULT 'unknown'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `messages`
--

CREATE TABLE `messages` (
  `id` varchar(36) NOT NULL,
  `room_id` varchar(20) NOT NULL,
  `text` text NOT NULL,
  `type` enum('normal','flash','lower_third','qa') NOT NULL DEFAULT 'normal',
  `bg_color` varchar(7) NOT NULL DEFAULT '#1e293b',
  `text_color` varchar(7) NOT NULL DEFAULT '#ffffff',
  `emoji` varchar(32) NOT NULL DEFAULT '',
  `is_active` tinyint(1) NOT NULL DEFAULT 0,
  `flash` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` bigint(20) NOT NULL,
  `expires_at` bigint(20) DEFAULT NULL,
  `last_modified` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `rooms`
--

CREATE TABLE `rooms` (
  `id` varchar(20) NOT NULL,
  `name` varchar(255) NOT NULL DEFAULT 'New Event',
  `password_hash` varchar(255) DEFAULT NULL,
  `plan` enum('free','pro','premium') NOT NULL DEFAULT 'free',
  `owner_id` varchar(64) NOT NULL DEFAULT 'local',
  `timezone` varchar(64) NOT NULL DEFAULT 'Asia/Jakarta',
  `master_clock` tinyint(1) NOT NULL DEFAULT 1,
  `on_air` tinyint(1) NOT NULL DEFAULT 0,
  `blackout` tinyint(1) NOT NULL DEFAULT 0,
  `current_timer_index` int(11) NOT NULL DEFAULT 0,
  `active_timer_id` varchar(36) DEFAULT NULL,
  `logo` text DEFAULT NULL,
  `primary_color` varchar(20) DEFAULT '#3b82f6',
  `background_color` varchar(20) DEFAULT '#0f172a',
  `venue_info` varchar(255) DEFAULT NULL,
  `is_archived` tinyint(1) NOT NULL DEFAULT '0',
  `is_template` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` bigint(20) NOT NULL,
  `last_modified` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `timers`
--

CREATE TABLE `timers` (
  `id` varchar(36) NOT NULL,
  `room_id` varchar(36) NOT NULL,
  `parent_id` varchar(36) DEFAULT NULL,
  `sort_order` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `speaker` varchar(255) DEFAULT NULL,
  `pic` varchar(255) NOT NULL DEFAULT '',
  `duration` int(11) NOT NULL,
  `elapsed` int(11) NOT NULL DEFAULT '0',
  `remaining` int(11) NOT NULL,
  `timer_mode` enum('countdown','countup','clock','time_of_day') NOT NULL DEFAULT 'countdown',
  `status` enum('idle','running','paused','finished','overtime') NOT NULL DEFAULT 'idle',
  `trigger_type` enum('manual','auto','previous_end') NOT NULL DEFAULT 'manual',
  `wrapup_colors` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`wrapup_colors`)),
  `chime` enum('none','bell','beep','ding','custom') NOT NULL DEFAULT 'none',
  `chime_at` int(11) NOT NULL DEFAULT '60',
  `notes` text DEFAULT NULL,
  `attachment_url` text DEFAULT NULL,
  `attachment_path` text DEFAULT NULL,
  `bg_color` varchar(20) DEFAULT NULL,
  `text_color` varchar(20) DEFAULT NULL,
  `show_speaker` tinyint(1) NOT NULL DEFAULT '1',
  `show_title` tinyint(1) NOT NULL DEFAULT '1',
  `is_locked` tinyint(1) NOT NULL DEFAULT '0',
  `overtime_limit` int(11) NOT NULL DEFAULT '0',
  `planned_start` bigint(20) DEFAULT NULL,
  `started_at` bigint(20) DEFAULT NULL,
  `paused_at` bigint(20) DEFAULT NULL,
  `last_modified` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indeks untuk tabel `event_logs`
--
ALTER TABLE `event_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_room` (`room_id`),
  ADD KEY `idx_time` (`timestamp`);

--
-- Indeks untuk tabel `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_room` (`room_id`),
  ADD KEY `idx_modified` (`last_modified`);

--
-- Indeks untuk tabel `rooms`
--
ALTER TABLE `rooms`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_owner` (`owner_id`),
  ADD KEY `idx_modified` (`last_modified`);

--
-- Indeks untuk tabel `timers`
--
ALTER TABLE `timers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_room` (`room_id`),
  ADD KEY `idx_order` (`room_id`,`sort_order`);

--
-- Ketidakleluasaan untuk tabel pelimpahan (Dumped Tables)
--

--
-- Ketidakleluasaan untuk tabel `messages`
--
ALTER TABLE `messages`
  ADD CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `timers`
--
ALTER TABLE `timers`
  ADD CONSTRAINT `timers_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
