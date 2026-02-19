import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function LegalRiskRegisterRedirect() {
  const [params] = useSearchParams();

  useEffect(() => {
    const page = params.get('page') || '1';
    const find = params.get('find') || '';
    const target = `/docs/risk-register-law.html?page=${encodeURIComponent(page)}${find ? `&find=${encodeURIComponent(find)}` : ''}`;
    window.location.replace(target);
  }, [params]);

  return <div>Qanun sənədi açılır...</div>;
}
