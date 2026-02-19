import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Enable UUID extension
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  // ============================================================
  // 1. users — İstifadəçilər + 6 rol
  // ============================================================
  await knex.schema.createTable('users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('email').unique().notNullable();
    t.string('password_hash').notNullable();
    t.string('full_name').notNullable();
    t.enum('role', [
      'admin',
      'risk_manager',
      'asset_owner',
      'incident_coordinator',
      'auditor',
      'dxeit_rep',
    ]).notNullable();
    t.string('department').nullable();
    t.string('position').nullable();
    t.boolean('is_active').defaultTo(true);
    t.text('refresh_token').nullable();
    t.timestamp('last_login').nullable();
    t.timestamps(true, true);
  });

  // ============================================================
  // 2. assets — Aktiv Kataloqu (Modul 1)
  // Qayda §4.2.2.1
  // ============================================================
  await knex.schema.createTable('assets', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('asset_code').unique().notNullable(); // AST-YYYY-XXXX
    t.string('name').notNullable();
    t.enum('category', ['əsas', 'dəstəkləyici']).notNullable();
    t.enum('sub_category', [
      'informasiya', 'hardware', 'software', 'şəbəkə', 'insan', 'fiziki',
    ]).notNullable();
    t.uuid('owner_id').references('id').inTable('users').nullable();
    t.integer('value').notNullable().checkBetween([1, 5]); // 1-5 skala
    t.enum('criticality', [
      'çox_aşağı', 'aşağı', 'orta', 'yüksək', 'kritik',
    ]).notNullable();
    t.string('location').notNullable();
    t.text('description').nullable();
    t.enum('status', [
      'aktiv', 'planlaşdırılan', 'köhnəlmiş', 'ləğv_edilmiş',
    ]).notNullable().defaultTo('aktiv');
    t.date('last_review').notNullable();
    t.uuid('created_by').references('id').inTable('users').nullable();
    t.timestamps(true, true);
  });

  // ============================================================
  // 3. requirements — Tələblər (Modul 7 + PATCH-02)
  // Qayda Əlavəsi §2.1
  // ============================================================
  await knex.schema.createTable('requirements', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('req_code').unique().notNullable(); // REQ-YYYY-XXXX
    t.string('req_title').notNullable();
    t.enum('req_category', [
      'normativ_akt', 'standart', 'müqavilə', 'öhdəlik',
      'qabaqcıl_təcrübə', 'praktik_tələbat',
    ]).notNullable();
    t.text('req_description').notNullable();
    t.enum('source_type', [
      'normativ_akt', 'standart', 'müqavilə', 'öhdəlik',
      'qabaqcıl_təcrübə', 'praktik_tələbat',
    ]).notNullable();
    t.string('source_ref').notNullable(); // Sənəd adı / nömrə
    t.specificType('activity_area', 'text[]').notNullable(); // PATCH-02: multi-select
    t.jsonb('principles').nullable(); // JSON array
    t.jsonb('applicability_scope').nullable();
    t.string('owner_role').notNullable();
    t.enum('review_frequency', ['rüblük', 'yarımillik', 'illik']).notNullable();
    t.enum('status', ['draft', 'aktiv', 'köhnəlmiş']).notNullable().defaultTo('draft');
    t.uuid('created_by').references('id').inTable('users').nullable();
    t.timestamps(true, true);
  });

  // ============================================================
  // 3b. requirements_history — Tələb versiyaları (PATCH-02)
  // ============================================================
  await knex.schema.createTable('requirements_history', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('requirement_id').references('id').inTable('requirements').onDelete('CASCADE').notNullable();
    t.integer('version_number').notNullable();
    t.jsonb('snapshot').notNullable(); // Köhnə versiyanın tam kopyası
    t.uuid('changed_by').references('id').inTable('users').nullable();
    t.text('change_reason').nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ============================================================
  // 4. threats — Təhdid Kataloqu (Modul 2 + PATCH-03)
  // Qayda §4.2.2.2, §5.5.2, Əlavə §3
  // ============================================================
  await knex.schema.createTable('threats', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('threat_code').unique().notNullable(); // THR-YYYY-XXXX
    t.string('name').notNullable();
    t.enum('category', [
      'texniki', 'fiziki', 'insani', 'prosessual', 'xarici',
    ]).notNullable();
    t.enum('source', ['kənardan', 'daxildən', 'hər_ikisi']).notNullable();
    t.specificType('purpose', 'text[]').notNullable(); // Multi-select
    t.enum('target_type', [
      'struktur', 'infrastruktur_komponenti', 'konfiqurasiya', 'proses', 'subyekt',
    ]).notNullable();
    t.enum('intentionality', ['qərəzli', 'təsadüfi', 'axın_üzrə']).notNullable();
    t.enum('severity', [
      'çox_aşağı', 'aşağı', 'orta', 'yüksək', 'kritik',
    ]).notNullable();
    t.integer('probability').notNullable().checkBetween([0, 100]); // Slider 0-100%
    t.text('realization_tech').nullable();
    t.boolean('is_external').defaultTo(false); // DXƏIT-dən gəlibsə true
    // PATCH-03 sahələri
    t.uuid('violated_requirement_id').references('id').inTable('requirements').nullable();
    t.jsonb('violated_principles').nullable();
    t.enum('severity_law', [
      'çox_aşağı', 'aşağı', 'orta', 'yüksək', 'kritik',
    ]).notNullable();
    t.enum('probability_band_law', [
      'p01_20', 'p21_40', 'p41_60', 'p61_80', 'p81_100',
    ]).notNullable();
    t.specificType('violated_activity_area', 'text[]').nullable();
    t.uuid('created_by').references('id').inTable('users').nullable();
    t.timestamps(true, true);
  });

  // ============================================================
  // 5. vulnerabilities — Boşluq / Uyğunsuzluq (Modul 3 + PATCH-05)
  // Qayda §4.2.2.4
  // ============================================================
  await knex.schema.createTable('vulnerabilities', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('vuln_code').unique().notNullable(); // VLN-YYYY-XXXX
    t.string('name').notNullable();
    t.enum('type', ['boşluq', 'nəzarətsizlik', 'zəiflik', 'uyğunsuzluq']).notNullable();
    t.string('cve_ref').nullable(); // CVE-XXXX-XXXX
    t.uuid('asset_id').references('id').inTable('assets').nullable();
    t.enum('severity_internal', [
      'az', 'orta', 'yüksək', 'çox_yüksək', 'kritik', 'fövqəladə',
    ]).notNullable();
    // PATCH-05: severity_law auto-map
    t.enum('severity_law', [
      'çox_aşağı', 'aşağı', 'orta', 'yüksək', 'kritik',
    ]).notNullable();
    t.boolean('severity_law_override').defaultTo(false);
    t.text('severity_law_override_reason').nullable();
    t.date('detection_date').notNullable();
    t.enum('detection_method', [
      'audit', 'pentest', 'özqiymətləndirmə', 'dxeit_bildirişi', 'insident',
    ]).notNullable();
    t.enum('exploitation_status', [
      'istifadə_olunmayıb', 'istifadə_cəhdi', 'istifadə_edilib',
    ]).notNullable().defaultTo('istifadə_olunmayıb');
    t.date('planned_fix_date').nullable();
    t.uuid('assignee_id').references('id').inTable('users').nullable();
    t.enum('status', [
      'açıq', 'işdə', 'həll_edilib', 'risk_kimi_qəbul_edilib',
    ]).notNullable().defaultTo('açıq');
    t.uuid('created_by').references('id').inTable('users').nullable();
    t.timestamps(true, true);
  });

  // ============================================================
  // 6. risks — Əsas Risk Cədvəli (Modul 4 + PATCH-07)
  // Qayda §4.2.3 — Hesablama formulları
  // ============================================================
  await knex.schema.createTable('risks', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('risk_code').unique().notNullable(); // RSK-YYYY-XXXX
    t.string('name').notNullable();
    t.enum('category', [
      'strateji', 'operativ', 'texniki', 'uyğunluq', 'reputasiya', 'fiziki',
    ]).notNullable();
    t.text('description').nullable();
    // Hesablama inputları
    t.decimal('asset_value', 5, 2).nullable(); // Əlaqəli aktivlərdən ortalama
    t.integer('probability_factor').notNullable().checkBetween([1, 5]);
    t.decimal('statistical_probability', 5, 2).nullable().checkBetween([0, 100]);
    t.decimal('prob_max', 5, 2).nullable(); // Avtomatik: MAX(...)
    t.integer('technical_impact').notNullable().checkBetween([1, 5]);
    t.integer('business_impact').notNullable().checkBetween([1, 5]);
    t.integer('impact_max').nullable(); // Avtomatik: MAX(tech, biz)
    // Hesablama nəticələri
    t.decimal('qualitative_score', 8, 2).nullable(); // asset_value × prob_max × impact_max
    t.decimal('quantitative_value', 12, 2).nullable();
    t.enum('priority', ['aşağı', 'orta', 'yüksək', 'kritik']).nullable();
    // Risk sahibi və emal
    t.uuid('risk_owner_id').references('id').inTable('users').nullable();
    t.enum('treatment_option', [
      'qarşısını_al', 'azalt', 'başqa_tərəfə_ötür', 'qəbul_et',
    ]).nullable();
    t.text('treatment_method').nullable();
    t.date('treatment_start').nullable();
    t.date('treatment_end').nullable();
    // PATCH-07: KPI sahələri
    t.decimal('inherent_risk_score', 8, 2).nullable();
    t.decimal('residual_risk_score', 8, 2).nullable();
    t.enum('residual_band_law', [
      'çox_aşağı', 'aşağı', 'orta', 'yüksək', 'kritik',
    ]).nullable();
    t.decimal('appetite_threshold', 8, 2).nullable();
    // Status
    t.enum('status', [
      'açıq', 'emalda', 'həll_edilib', 'qəbul_edilib', 'bağlı',
    ]).notNullable().defaultTo('açıq');
    t.uuid('created_by').references('id').inTable('users').nullable();
    t.timestamps(true, true);
  });

  // ============================================================
  // 7. risk_assets — Risk ↔ Aktiv M2M
  // ============================================================
  await knex.schema.createTable('risk_assets', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('risk_id').references('id').inTable('risks').onDelete('CASCADE').notNullable();
    t.uuid('asset_id').references('id').inTable('assets').onDelete('CASCADE').notNullable();
    t.unique(['risk_id', 'asset_id']);
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ============================================================
  // 8. risk_threats — Risk ↔ Təhdid + PATCH-03
  // ============================================================
  await knex.schema.createTable('risk_threats', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('risk_id').references('id').inTable('risks').onDelete('CASCADE').notNullable();
    t.uuid('threat_id').references('id').inTable('threats').onDelete('CASCADE').notNullable();
    t.enum('link_type', ['primary', 'secondary']).notNullable().defaultTo('primary');
    t.text('rationale').nullable();
    t.uuid('created_by').references('id').inTable('users').nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.unique(['risk_id', 'threat_id']);
  });

  // ============================================================
  // 9. risk_vulnerabilities — Risk ↔ Boşluq M2M
  // ============================================================
  await knex.schema.createTable('risk_vulnerabilities', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('risk_id').references('id').inTable('risks').onDelete('CASCADE').notNullable();
    t.uuid('vulnerability_id').references('id').inTable('vulnerabilities').onDelete('CASCADE').notNullable();
    t.unique(['risk_id', 'vulnerability_id']);
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ============================================================
  // 10. consequences — Fəsadlar (PATCH-06)
  // Qayda §4.2.2.6, Əlavə §4
  // ============================================================
  await knex.schema.createTable('consequences', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('risk_id').references('id').inTable('risks').onDelete('CASCADE').notNullable();
    t.enum('consequence_category', [
      'continuity', 'reputasiya', 'maliyyə', 'hüquqi', 'əməliyyat', 'texnoloji', 'insan',
    ]).notNullable();
    t.text('consequence_description').notNullable();
    t.enum('probability_band_law', [
      'p01_20', 'p21_40', 'p41_60', 'p61_80', 'p81_100',
    ]).notNullable();
    t.enum('severity_law', [
      'çox_aşağı', 'aşağı', 'orta', 'yüksək', 'kritik',
    ]).notNullable();
    t.uuid('related_threat_id').references('id').inTable('threats').nullable();
    t.uuid('related_requirement_id').references('id').inTable('requirements').nullable();
    t.string('evidence').nullable();
    t.timestamps(true, true);
  });

  // ============================================================
  // 11. incidents — İnsident Reyestri (Modul 5 + PATCH-07)
  // Qayda §4.3.4, §6.1.5
  // ============================================================
  await knex.schema.createTable('incidents', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('incident_code').unique().notNullable(); // INC-YYYY-XXXX
    t.uuid('risk_id').references('id').inTable('risks').nullable();
    t.string('title').notNullable();
    t.enum('type', [
      'kiberhücum', 'məlumat_sızması', 'sistem_çöküşü',
      'uyğunsuzluq', 'fiziki', 'digər',
    ]).notNullable();
    t.enum('severity', ['P1_kritik', 'P2_yüksək', 'P3_orta', 'P4_aşağı']).notNullable();
    // PATCH-07: KPI-2 input
    t.enum('impact_law', [
      'çox_aşağı', 'aşağı', 'orta', 'yüksək', 'kritik',
    ]).nullable();
    t.timestamp('detection_datetime').notNullable();
    t.timestamp('occurrence_datetime').nullable();
    t.text('description').notNullable();
    t.enum('response_option', [
      'aşkarlama', 'bloklama', 'bərpaetmə', 'anti_böhran',
      'sübut_toplama', 'ehtiyat_varianta_keçmə',
    ]).nullable();
    t.text('root_cause').nullable();
    t.timestamp('resolution_datetime').nullable();
    t.boolean('notify_dxeit').defaultTo(false);
    t.enum('status', [
      'yeni', 'kateqoriyalaşdırılır', 'planlaşdırılır',
      'həll_edilir', 'bağlı', 'analiz',
    ]).notNullable().defaultTo('yeni');
    t.uuid('created_by').references('id').inTable('users').nullable();
    t.timestamps(true, true);
  });

  // ============================================================
  // 12. incident_actions — İnsident cavab addımları
  // ============================================================
  await knex.schema.createTable('incident_actions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('incident_id').references('id').inTable('incidents').onDelete('CASCADE').notNullable();
    t.string('action_title').notNullable();
    t.text('action_description').nullable();
    t.uuid('assigned_to').references('id').inTable('users').nullable();
    t.enum('status', ['gözləmədə', 'icrada', 'tamamlandı']).notNullable().defaultTo('gözləmədə');
    t.timestamp('due_date').nullable();
    t.timestamp('completed_at').nullable();
    t.timestamps(true, true);
  });

  // ============================================================
  // 13. solutions — Həllər Kataloqu (Modul 6)
  // Qayda §5.5.3, §6.2
  // ============================================================
  await knex.schema.createTable('solutions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('solution_code').unique().notNullable(); // SOL-YYYY-XXXX
    t.string('name').notNullable();
    t.enum('type', ['qabaqlayıcı', 'nəzarətedici', 'təshihedici', 'bərpaedici']).notNullable();
    t.enum('solution_kind', ['texniki', 'təşkilati']).notNullable();
    t.enum('technology', [
      'SIEM', 'DLP', 'UEBA', 'Firewall', 'EDR', 'WAF', 'Şifrələmə', 'Digər',
    ]).nullable();
    t.boolean('is_ai').defaultTo(false);
    t.integer('effectiveness').checkBetween([1, 10]).nullable();
    t.enum('cost_level', ['aşağı', 'orta', 'yüksək']).nullable();
    t.boolean('is_certified').defaultTo(false);
    t.string('certification_link').nullable();
    t.enum('source', ['dxeit_kataloqu', 'daxili', 'vendor']).notNullable();
    t.text('description').nullable();
    t.text('playbook').nullable();
    t.uuid('created_by').references('id').inTable('users').nullable();
    t.timestamps(true, true);
  });

  // ============================================================
  // 14. risk_solutions — Risk ↔ Həll M2M
  // ============================================================
  await knex.schema.createTable('risk_solutions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('risk_id').references('id').inTable('risks').onDelete('CASCADE').notNullable();
    t.uuid('solution_id').references('id').inTable('solutions').onDelete('CASCADE').notNullable();
    t.unique(['risk_id', 'solution_id']);
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ============================================================
  // 15. thresholds — Hədlər (Modul 7 + PATCH-04)
  // Qayda §2.2
  // ============================================================
  await knex.schema.createTable('thresholds', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.enum('threshold_type', [
      'MAO', 'MBCO', 'Maturity', 'EAL', 'SLA', 'OLA',
      'CIA', 'Reliability', 'Priority', 'Criticality',
      'Regime', 'DocumentationProtection', 'Effectiveness',
    ]).notNullable();
    t.enum('applies_to_type', [
      'proses', 'servis', 'aktiv', 'rol', 'sənəd_reyestri', 'bölmə', 'idarəetmə_aləti', 'texniki_alət',
    ]).notNullable();
    t.uuid('applies_to_id').nullable();
    t.string('value').notNullable(); // 99.9%, 4 saat, level-3
    t.string('unit').nullable(); // %, hours, days, level
    t.jsonb('scale_definition').nullable();
    t.string('evidence_link').nullable();
    t.string('owner_role').nullable();
    t.enum('review_frequency', ['rüblük', 'yarımillik', 'illik']).nullable();
    t.uuid('created_by').references('id').inTable('users').nullable();
    t.timestamps(true, true);
  });

  // ============================================================
  // 16. reconciliations — Uzlaşdırma / Mapping (PATCH-01)
  // Qayda §1.8, §7.1.3–7.1.4
  // ============================================================
  await knex.schema.createTable('reconciliations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.enum('entity_type', [
      'risk', 'asset', 'threat', 'vulnerability', 'incident',
      'requirement', 'control', 'consequence',
    ]).notNullable();
    t.uuid('entity_id').notNullable();
    t.string('source_system').notNullable(); // DXƏIT / SIEM / CMDB / Manual
    t.string('source_table').nullable();
    t.string('source_record_id').nullable();
    t.enum('sync_direction', ['inbound', 'outbound', 'bidirectional']).notNullable();
    t.timestamp('last_sync_at').nullable();
    t.enum('sync_status', [
      'ok', 'failed', 'pending', 'conflict', 'disabled',
    ]).notNullable().defaultTo('pending');
    t.string('source_hash').nullable();
    t.uuid('mapping_rule_id').nullable();
    t.text('conflict_notes').nullable();
    t.timestamps(true, true);
  });

  // ============================================================
  // 16b. mapping_rules — Uzlaşdırma qaydaları (PATCH-01)
  // ============================================================
  await knex.schema.createTable('mapping_rules', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name').notNullable();
    t.enum('entity_type', [
      'risk', 'asset', 'threat', 'vulnerability', 'incident',
      'requirement', 'control', 'consequence',
    ]).notNullable();
    t.jsonb('rule_definition').notNullable();
    t.boolean('is_active').defaultTo(true);
    t.uuid('created_by').references('id').inTable('users').nullable();
    t.timestamps(true, true);
  });

  // Add FK from reconciliations to mapping_rules
  await knex.schema.alterTable('reconciliations', (t) => {
    t.foreign('mapping_rule_id').references('id').inTable('mapping_rules');
  });

  // ============================================================
  // 17. audit_log — Tam Audit İzi (PATCH-08)
  // Qayda §9.3, §9.5
  // ============================================================
  await knex.schema.createTable('audit_log', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('entity_type').notNullable(); // risk, asset, threat, vuln, etc.
    t.uuid('entity_id').notNullable();
    t.enum('action', [
      'create', 'update', 'delete', 'override',
      'resolve_conflict', 'export', 'sync',
    ]).notNullable();
    t.jsonb('changed_fields').nullable(); // [{field, old_value, new_value}]
    t.text('reason').nullable(); // Override/resolve üçün məcburi
    t.uuid('actor_user_id').references('id').inTable('users').nullable();
    t.string('actor_role').nullable();
    t.string('ip_address').nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Indexes for performance
  await knex.raw('CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id)');
  await knex.raw('CREATE INDEX idx_audit_log_actor ON audit_log(actor_user_id)');
  await knex.raw('CREATE INDEX idx_audit_log_created ON audit_log(created_at)');
  await knex.raw('CREATE INDEX idx_risks_status ON risks(status)');
  await knex.raw('CREATE INDEX idx_risks_priority ON risks(priority)');
  await knex.raw('CREATE INDEX idx_incidents_status ON incidents(status)');
  await knex.raw('CREATE INDEX idx_assets_category ON assets(category)');
  await knex.raw('CREATE INDEX idx_threats_severity ON threats(severity)');
  await knex.raw('CREATE INDEX idx_vulnerabilities_status ON vulnerabilities(status)');
  await knex.raw('CREATE INDEX idx_reconciliations_status ON reconciliations(sync_status)');
}

export async function down(knex: Knex): Promise<void> {
  const tables = [
    'audit_log', 'mapping_rules', 'reconciliations',
    'thresholds', 'risk_solutions', 'solutions',
    'incident_actions', 'incidents', 'consequences',
    'risk_vulnerabilities', 'risk_threats', 'risk_assets',
    'risks', 'vulnerabilities', 'threats',
    'requirements_history', 'requirements', 'assets', 'users',
  ];
  for (const table of tables) {
    await knex.schema.dropTableIfExists(table);
  }
}
