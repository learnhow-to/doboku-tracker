import { getDatabase, query } from '../config/database.js';
import { runMigrations } from './migrate.js';

export async function seedDatabase() {
  console.log('[SEED] Seeding test and demo data...');
  await runMigrations();

  // Organizations
  await query(`
    INSERT INTO organizations (id, name, code)
    VALUES 
      ('org-yamada', '東京土木建設株式会社', 'tokyo-doboku'),
      ('org-satou', '佐藤組株式会社', 'satou-gumi')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code;
  `);

  // Users
  await query(`
    INSERT INTO users (id, auth_id, email, display_name)
    VALUES 
      ('usr-admin', 'auth-admin', 'admin@tokyodoboku.co.jp', '田中 宏 (管理者)'),
      ('usr-foreman', 'auth-foreman', 'foreman@tokyodoboku.co.jp', '鈴木 一郎 (現場主任/監督)'),
      ('usr-worker-1', 'auth-worker-1', 'sato@tokyodoboku.co.jp', '佐藤 健太 (作業員)'),
      ('usr-worker-2', 'auth-worker-2', 'takahashi@tokyodoboku.co.jp', '高橋 雄二 (作業員)'),
      ('usr-office', 'auth-office', 'office@tokyodoboku.co.jp', '渡辺 美咲 (事務/承認者)'),
      ('usr-other-org', 'auth-other-org', 'ito@satou-gumi.jp', '伊藤 達也 (他社作業員)')
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  `);

  // Organization Memberships
  await query(`
    INSERT INTO organization_memberships (id, organization_id, user_id, role, is_active)
    VALUES 
      ('mem-admin', 'org-yamada', 'usr-admin', 'admin', true),
      ('mem-foreman', 'org-yamada', 'usr-foreman', 'foreman', true),
      ('mem-worker-1', 'org-yamada', 'usr-worker-1', 'worker', true),
      ('mem-worker-2', 'org-yamada', 'usr-worker-2', 'worker', true),
      ('mem-office', 'org-yamada', 'usr-office', 'office', true),
      ('mem-other', 'org-satou', 'usr-other-org', 'worker', true)
    ON CONFLICT (id) DO NOTHING;
  `);

  // Projects
  await query(`
    INSERT INTO projects (id, organization_id, name, code, location, main_contractor, status)
    VALUES 
      ('proj-shibuya', 'org-yamada', '渋谷区本町道路改良工事', 'SHIBUYA-2026-01', '東京都渋谷区本町3丁目', '大林道路株式会社', 'active'),
      ('proj-shinjuku', 'org-yamada', '新宿排水管敷設工事', 'SHINJUKU-2026-02', '東京都新宿区西新宿', '鹿島建設株式会社', 'active'),
      ('proj-yokohama', 'org-satou', '横浜港湾整備工事', 'YOKOHAMA-2026-01', '神奈川県横浜市中区', '五洋建設株式会社', 'active')
    ON CONFLICT (id) DO NOTHING;
  `);

  // Project Memberships
  // Notice: Sato (worker-1) is assigned to Shibuya, but NOT assigned to Shinjuku!
  // Takahashi (worker-2) is assigned to Shinjuku, but NOT assigned to Shibuya!
  await query(`
    INSERT INTO project_memberships (id, project_id, user_id, role)
    VALUES 
      ('pm-1', 'proj-shibuya', 'usr-foreman', 'foreman'),
      ('pm-2', 'proj-shibuya', 'usr-worker-1', 'worker'),
      ('pm-3', 'proj-shibuya', 'usr-office', 'office'),
      ('pm-4', 'proj-shinjuku', 'usr-foreman', 'foreman'),
      ('pm-5', 'proj-shinjuku', 'usr-worker-2', 'worker'),
      ('pm-6', 'proj-yokohama', 'usr-other-org', 'worker')
    ON CONFLICT (id) DO NOTHING;
  `);

  // Sample Daily Reports for Demo & Testing
  const todayStr = new Date().toISOString().split('T')[0];
  
  await query(`
    INSERT INTO daily_reports (
      id, project_id, organization_id, work_date, weather, reporter_id, reporter_name,
      status, version, site_start_time, site_end_time, break_minutes, handover_notes
    ) VALUES 
      ('rep-shibuya-today', 'proj-shibuya', 'org-yamada', '${todayStr}', '晴', 'usr-worker-1', '佐藤 健太 (作業員)', 'DRAFT', 1, '08:00', '17:00', 60, '明日は雨天予報のため、掘削面の養生シートを二重に展張しました。'),
      ('rep-shibuya-yesterday', 'proj-shibuya', 'org-yamada', '2026-09-12', '曇', 'usr-worker-1', '佐藤 健太 (作業員)', 'SUBMITTED', 1, '08:00', '17:00', 60, '配管敷設後の埋戻し完了。月曜日に舗装復旧予定。')
    ON CONFLICT (id) DO NOTHING;
  `);

  // Report Workers
  await query(`
    INSERT INTO report_workers (id, report_id, name, company, trade, work_hours, overtime_hours)
    VALUES 
      ('rw-1', 'rep-shibuya-today', '佐藤 健太', '自社', '普通作業員', 8.0, 1.0),
      ('rw-2', 'rep-shibuya-today', '高橋 雄二', '自社', '重機オペレーター', 8.0, 0.0),
      ('rw-3', 'rep-shibuya-yesterday', '佐藤 健太', '自社', '普通作業員', 8.0, 0.0)
    ON CONFLICT (id) DO NOTHING;
  `);

  // Work Items
  await query(`
    INSERT INTO work_items (id, report_id, work_type, description, location_sta, quantity, unit)
    VALUES 
      ('wi-1', 'rep-shibuya-today', '土工', '路床掘削工・残土搬出', 'STA 1+20', 45.0, 'm³'),
      ('wi-2', 'rep-shibuya-today', '路盤工', '下層路盤整地・転圧', 'STA 1+00〜1+20', 120.0, 'm²'),
      ('wi-3', 'rep-shibuya-yesterday', '配管工', '排水本管敷設工 (φ200)', 'STA 0+80〜1+00', 20.0, 'm')
    ON CONFLICT (id) DO NOTHING;
  `);

  // Equipment Entries (Including Diesel Solar)
  await query(`
    INSERT INTO equipment_entries (id, report_id, name, vendor, quantity, unit, operating_hours, diesel_liters, notes)
    VALUES 
      ('eq-1', 'rep-shibuya-today', '2TDT', '自社', 2, '台', 6.5, 40.0, '場内運搬'),
      ('eq-2', 'rep-shibuya-today', 'バックホウ 0.25m3', '自社', 1, '台', 7.0, 65.0, '掘削積込'),
      ('eq-3', 'rep-shibuya-today', 'プレート', '自社', 1, '台', 4.0, NULL, '転圧')
    ON CONFLICT (id) DO NOTHING;
  `);

  // Material Entries
  await query(`
    INSERT INTO material_entries (id, report_id, name, vendor, quantity, unit, is_purchased)
    VALUES 
      ('mat-1', 'rep-shibuya-today', '砕石 (RC-40)', '自社', 12.0, 't', false),
      ('mat-2', 'rep-shibuya-today', 'セメント', '自社', 5.0, '袋', false)
    ON CONFLICT (id) DO NOTHING;
  `);

  // KY Records
  await query(`
    INSERT INTO ky_records (id, report_id, meeting_time, attendees_count, specific_hazards, countermeasures, supervisor_name, is_checked)
    VALUES 
      ('ky-1', 'rep-shibuya-today', '07:50', 2, '重機旋回範囲への立ち入り、掘削法面の崩落', '誘導員の配置、合図確認の徹底、法肩から0.5m離隔', '鈴木 一郎', true),
      ('ky-2', 'rep-shibuya-yesterday', '07:50', 2, '配管吊り荷の下への立ち入り', '吊り荷下立ち入り禁止、玉掛け点検', '鈴木 一郎', true)
    ON CONFLICT (id) DO NOTHING;
  `);

  // Master Workers (Reusable Registry for Organization)
  await query(`
    INSERT INTO master_workers (id, organization_id, name, company, trade, default_work_hours, is_active)
    VALUES 
      ('mw-1', 'org-yamada', '佐藤 健太', '自社', '普通作業員', 8.0, true),
      ('mw-2', 'org-yamada', '高橋 雄二', '自社', '重機オペレーター', 8.0, true),
      ('mw-3', 'org-yamada', '渡辺 浩二', '自社', '土工', 8.0, true),
      ('mw-4', 'org-yamada', '小林 義男', '株式会社東京建工', '型枠大工', 8.0, true),
      ('mw-5', 'org-yamada', '中村 亮', '自社', '警備員・合図員', 8.0, true)
    ON CONFLICT (id) DO NOTHING;
  `);

  // Master Equipment (Reusable Fleet/Machinery Registry)
  await query(`
    INSERT INTO master_equipment (id, organization_id, name, code_number, category, vendor, unit, is_active)
    VALUES 
      ('me-1', 'org-yamada', '2Tダンプ (2TDT)', 'DT-01', 'truck', '自社', '台', true),
      ('me-2', 'org-yamada', '4Tダンプ (4TDT)', 'DT-02', 'truck', '自社', '台', true),
      ('me-3', 'org-yamada', '0.25BH (バックホウ)', 'BH-01', 'heavy_machinery', '自社', '台', true),
      ('me-4', 'org-yamada', '0.45BH (バックホウ大型)', 'BH-02', 'heavy_machinery', '株式会社レンタルのニッケン', '台', true),
      ('me-5', 'org-yamada', 'プレートコンパクター', 'PL-01', 'compactor', '自社', '台', true),
      ('me-6', 'org-yamada', '防音型発電機 (25kVA)', 'GEN-01', 'generator', '自社', '台', true)
    ON CONFLICT (id) DO NOTHING;
  `);

  console.log('[SEED] Seeding completed.');
}

if (process.argv[1] && process.argv[1].includes('seed.ts')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[SEED] Seeding failed:', err);
      process.exit(1);
    });
}
