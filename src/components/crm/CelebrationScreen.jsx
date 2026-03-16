import React, { useEffect, useState, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';

// ---- helpers ----
const formatCurrency = (value) => {
  if (!value && value !== 0) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

// ---- CelebrationScreen ----
/**
 * Props:
 *   deal   – pipeline_deals row (with property_title, property_neighborhood)
 *   lead   – crm_leads row
 *   onClose – fn()
 */
export default function CelebrationScreen({ deal, lead, onClose }) {
  const [monthlyGoalPct, setMonthlyGoalPct] = useState(null);
  const [animReady, setAnimReady] = useState(false);

  // ── Haptic ──────────────────────────────────────────────────
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  }, []);

  // ── Entry animation delay ────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setAnimReady(true), 50);
    return () => clearTimeout(t);
  }, []);

  // ── Confetti ─────────────────────────────────────────────────
  const fireConfetti = useCallback(() => {
    const colors = ['#C9A84C', '#ffffff', '#1D9E75', '#FFD700', '#E8C97D'];

    const burst = (origin) => {
      confetti({
        particleCount: 120,
        spread: 90,
        origin,
        colors,
        scalar: 1.1,
        gravity: 0.9,
        ticks: 200,
      });
    };

    burst({ x: 0.3, y: 0.45 });
    burst({ x: 0.7, y: 0.45 });

    setTimeout(() => {
      burst({ x: 0.5, y: 0.5 });
    }, 1500);
  }, []);

  useEffect(() => {
    const t = setTimeout(fireConfetti, 200);
    return () => clearTimeout(t);
  }, [fireConfetti]);

  // ── Monthly goal from admin_settings ────────────────────────
  useEffect(() => {
    const supabaseUrl = 'https://hcmpjrqpjohksoznoycq.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjbXBqcnFwam9oa3Nvem5veWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTk0NjAsImV4cCI6MjA4ODU3NTQ2MH0.XRWi4ZULpICkTucXgGVQCP5wq1RmVwOFWTdMrOEMDnw';
    const hdrs = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };

    // Get monthly goal setting
    fetch(`${supabaseUrl}/rest/v1/admin_settings?key=eq.monthly_goal&select=value`, { headers: hdrs })
      .then(r => r.ok ? r.json() : [])
      .then(rows => {
        const goal = Number(rows?.[0]?.value) || 0;
        if (!goal) return;

        // Get closed deals this month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        fetch(`${supabaseUrl}/rest/v1/pipeline_deals?status=eq.fechado&closed_at=gte.${startOfMonth}&select=deal_value`, { headers: hdrs })
          .then(r => r.ok ? r.json() : [])
          .then(deals => {
            const total = (deals || []).reduce((s, d) => s + (Number(d.deal_value) || 0), 0);
            const pct = Math.min(100, Math.round((total / goal) * 100));
            setMonthlyGoalPct(pct);
          })
          .catch(() => {});
      })
      .catch(() => {});
  }, []);

  // ── Share ─────────────────────────────────────────────────────
  const handleShare = () => {
    const propName = deal?.property_title || 'Imóvel';
    const propNeighborhood = deal?.property_neighborhood;
    const dealValue = formatCurrency(deal?.deal_value);

    const text = `🏆 Mais uma venda fechada!\n\n${propName}${propNeighborhood ? ` — ${propNeighborhood}` : ''}\n${dealValue}\n\n#ImobiPro #VivaBeiramar`;

    if (navigator.share) {
      navigator.share({ title: 'Venda Fechada! 🏆', text }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const dealValue = deal?.deal_value;
  const commissionValue = deal?.commission_value;
  const propertyName = deal?.property_title;
  const propertyNeighborhood = deal?.property_neighborhood;
  const leadName = lead?.name;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.82)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Card */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(160deg, #0f1d2a 0%, #1B2B3A 60%, #0d1f2e 100%)',
          border: '1px solid rgba(201,168,76,0.3)',
          borderRadius: '28px',
          padding: '40px 32px 32px',
          maxWidth: '420px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.08), inset 0 1px 0 rgba(255,255,255,0.06)',
          transform: animReady ? 'scale(1)' : 'scale(0.85)',
          opacity: animReady ? 1 : 0,
          transition: 'transform 320ms cubic-bezier(0.34,1.56,0.64,1), opacity 250ms ease-out',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle gold shimmer bg */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(201,168,76,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Trophy icon */}
        <div style={{ fontSize: '48px', lineHeight: 1, marginBottom: '12px' }}>🏆</div>

        {/* "VENDAAA!" */}
        <VendaTitle />

        {/* Lead name */}
        <p style={{
          fontSize: '18px',
          fontWeight: 600,
          color: '#fff',
          margin: '0 0 4px',
          letterSpacing: '0.01em',
        }}>
          {leadName}
        </p>

        {/* Property */}
        {(propertyName || propertyNeighborhood) && (
          <p style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.55)',
            margin: '0 0 24px',
          }}>
            {propertyName}{propertyNeighborhood ? ` — ${propertyNeighborhood}` : ''}
          </p>
        )}

        {/* Deal value */}
        {dealValue && (
          <div style={{ marginBottom: '20px' }}>
            <p style={{
              fontSize: '30px',
              fontWeight: 800,
              color: '#fff',
              margin: '0',
              letterSpacing: '-0.5px',
              fontFamily: "'Playfair Display', serif",
            }}>
              {formatCurrency(dealValue)}
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '4px 0 0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              valor do negócio
            </p>
          </div>
        )}

        {/* Commission card — star of the show */}
        {commissionValue > 0 && (
          <CommissionCard value={commissionValue} />
        )}

        {/* Monthly goal bar */}
        {monthlyGoalPct !== null && (
          <GoalBar pct={monthlyGoalPct} />
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
          <button
            onClick={handleShare}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '14px',
              background: 'rgba(201,168,76,0.12)',
              border: '1px solid rgba(201,168,76,0.3)',
              color: '#C9A84C',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(201,168,76,0.22)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(201,168,76,0.12)'}
          >
            📱 Compartilhar
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '14px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.7)',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          >
            ✕ Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────

function VendaTitle() {
  const [scaled, setScaled] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setScaled(true), 120);
    return () => clearTimeout(t);
  }, []);
  return (
    <h2 style={{
      fontSize: '34px',
      fontWeight: 800,
      color: '#C9A84C',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      margin: '0 0 20px',
      fontFamily: "'Playfair Display', serif",
      transform: scaled ? 'scale(1)' : 'scale(0.8)',
      opacity: scaled ? 1 : 0,
      transition: 'transform 300ms ease-out, opacity 250ms ease-out',
      textShadow: '0 0 40px rgba(201,168,76,0.4)',
    }}>
      VENDAAA! 🎉
    </h2>
  );
}

function CommissionCard({ value }) {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(201,168,76,0.18) 0%, rgba(201,168,76,0.08) 100%)',
      border: '1px solid rgba(201,168,76,0.35)',
      borderRadius: '18px',
      padding: '20px 24px',
      marginBottom: '20px',
      transform: entered ? 'translateY(0)' : 'translateY(12px)',
      opacity: entered ? 1 : 0,
      transition: 'transform 400ms cubic-bezier(0.34,1.56,0.64,1), opacity 350ms ease-out',
    }}>
      <p style={{
        fontSize: '12px',
        color: 'rgba(201,168,76,0.7)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        margin: '0 0 8px',
        fontWeight: 600,
      }}>
        Sua comissão:
      </p>
      <p style={{
        fontSize: '38px',
        fontWeight: 800,
        color: '#C9A84C',
        margin: 0,
        letterSpacing: '-1px',
        fontFamily: "'Playfair Display', serif",
        textShadow: '0 0 30px rgba(201,168,76,0.3)',
      }}>
        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
      </p>
    </div>
  );
}

function GoalBar({ pct }) {
  const [animPct, setAnimPct] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnimPct(pct), 600);
    return () => clearTimeout(t);
  }, [pct]);

  const clampedPct = Math.min(100, Math.max(0, pct));

  return (
    <div style={{ textAlign: 'left' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Meta do mês
        </span>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#C9A84C' }}>{pct}%</span>
      </div>
      <div style={{
        height: '8px',
        background: 'rgba(255,255,255,0.08)',
        borderRadius: '99px',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${animPct}%`,
          background: 'linear-gradient(90deg, #1D9E75, #C9A84C)',
          borderRadius: '99px',
          transition: 'width 900ms cubic-bezier(0.34,1.56,0.64,1)',
          boxShadow: '0 0 8px rgba(201,168,76,0.4)',
        }} />
      </div>
    </div>
  );
}
