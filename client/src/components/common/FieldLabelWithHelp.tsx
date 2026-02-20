import React, { useEffect, useMemo, useState } from 'react';
import { Button, Drawer, Space, Tag, Tooltip, Typography, theme } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { getFieldHelp } from '../../help/registry';
import { extractClauseIds, getClauseTexts } from '../../help/legalClauseText';

interface FieldLabelWithHelpProps {
  fieldKey: string;
  label: string;
  required?: boolean;
}

export default function FieldLabelWithHelp({ fieldKey, label, required = false }: FieldLabelWithHelpProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [clauseTexts, setClauseTexts] = useState<Record<string, string | null>>({});
  const help = useMemo(() => getFieldHelp(fieldKey), [fieldKey]);
  const { token } = theme.useToken();
  const clauseIds = useMemo(() => (help ? extractClauseIds(help.legal_ref) : []), [help]);

  useEffect(() => {
    if (!drawerOpen || !help || clauseIds.length === 0) {
      return;
    }

    getClauseTexts(clauseIds)
      .then((result) => setClauseTexts(result))
      .catch(() => setClauseTexts({}));
  }, [drawerOpen, help, clauseIds]);

  const openLegalDoc = () => {
    if (!help) return;
    const terms = help.search_terms_az?.length ? help.search_terms_az : [help.pdf_anchor];
    const url = `/legal/risk-register?page=${help.pdf_page}&find=${encodeURIComponent(terms.join('||'))}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!help) {
    return <span>{required ? `${label} *` : label}</span>;
  }

  const tooltipContent = (
    <Space direction="vertical" size={4}>
      <Typography.Text style={{ color: token.colorText }}>{help.help_text_az}</Typography.Text>
      <Button
        type="link"
        size="small"
        style={{ padding: 0, color: token.colorPrimary }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDrawerOpen(true);
        }}
      >
        Daha çox
      </Button>
    </Space>
  );

  const drawerTitle = `${help.ui_label_az && !help.ui_label_az.includes('_') ? help.ui_label_az : label} — Kömək`;

  return (
    <>
      <Space size={6}>
        <span>{required ? `${label} *` : label}</span>
        <Tooltip
          title={tooltipContent}
          trigger={['hover', 'click']}
          color={token.colorBgElevated}
          styles={{ body: { color: token.colorText } }}
        >
          <QuestionCircleOutlined style={{ cursor: 'pointer', color: token.colorPrimary }} />
        </Tooltip>
      </Space>

      <Drawer
        title={drawerTitle}
        placement="right"
        width={420}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Typography.Paragraph style={{ color: token.colorText }}>{help.help_text_az}</Typography.Paragraph>
        <Typography.Paragraph style={{ color: token.colorText }}><strong>Qanun istinadı:</strong> {help.legal_ref}</Typography.Paragraph>
        <Typography.Text strong style={{ color: token.colorText }}>Maddə və cümlələr:</Typography.Text>
        <Typography.Paragraph style={{ color: token.colorText, whiteSpace: 'pre-line', marginTop: 8 }}>
          {help.legal_excerpt_az || `${help.legal_ref}. Axtarış ifadələri: ${(help.search_terms_az || [help.pdf_anchor]).join(', ')}`}
        </Typography.Paragraph>
        {clauseIds.length > 0 && (
          <>
            <Typography.Text strong style={{ color: token.colorText }}>Maddə mətni (sənəddən):</Typography.Text>
            <div style={{ marginTop: 8 }}>
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                {clauseIds.map((clauseId) => {
                  const text = clauseTexts[clauseId];
                  return (
                    <div key={clauseId}>
                      <Typography.Text strong style={{ color: token.colorText }}>{`${clauseId}.`}</Typography.Text>
                      <Typography.Paragraph style={{ color: token.colorText, margin: '4px 0 0' }}>
                        {text || 'Bu maddə üçün mətni sənəddən avtomatik çıxarmaq mümkün olmadı.'}
                      </Typography.Paragraph>
                    </div>
                  );
                })}
              </Space>
            </div>
          </>
        )}
        {help.example_az && (
          <Typography.Paragraph style={{ color: token.colorText }}><strong>Nümunə:</strong> {help.example_az}</Typography.Paragraph>
        )}
        {help.allowed_values && help.allowed_values.length > 0 && (
          <>
            <Typography.Text strong style={{ color: token.colorText }}>İcazə verilən dəyərlər:</Typography.Text>
            <div style={{ marginTop: 8 }}>
              <Space size={[6, 6]} wrap>
                {help.allowed_values.map((value) => (
                  <Tag key={value}>{value}</Tag>
                ))}
              </Space>
            </div>
          </>
        )}

        <div style={{ marginTop: 16 }}>
          <Button type="primary" onClick={openLegalDoc}>Sənəddə aç</Button>
        </div>
      </Drawer>
    </>
  );
}
