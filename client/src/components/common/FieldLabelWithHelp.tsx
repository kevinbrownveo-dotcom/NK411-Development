import React, { useMemo, useState } from 'react';
import { Button, Drawer, Space, Tag, Tooltip, Typography, theme } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { getFieldHelp } from '../../help/registry';

interface FieldLabelWithHelpProps {
  fieldKey: string;
  label: string;
  required?: boolean;
}

export default function FieldLabelWithHelp({ fieldKey, label, required = false }: FieldLabelWithHelpProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const help = useMemo(() => getFieldHelp(fieldKey), [fieldKey]);
  const { token } = theme.useToken();

  const openLegalDoc = () => {
    if (!help) return;
    const url = `/legal/risk-register?page=${help.pdf_page}&find=${encodeURIComponent(help.pdf_anchor)}`;
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
        title={`${help.ui_label_az} — Kömək`}
        placement="right"
        width={420}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Typography.Paragraph style={{ color: token.colorText }}>{help.help_text_az}</Typography.Paragraph>
        <Typography.Paragraph style={{ color: token.colorText }}><strong>Qanun istinadı:</strong> {help.legal_ref}</Typography.Paragraph>
        <Typography.Text strong style={{ color: token.colorText }}>Maddə və cümlələr:</Typography.Text>
        <Typography.Paragraph style={{ color: token.colorText, whiteSpace: 'pre-line', marginTop: 8 }}>
          {help.legal_excerpt_az || `${help.legal_ref}. Axtarış ifadəsi: ${help.pdf_anchor}`}
        </Typography.Paragraph>
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
