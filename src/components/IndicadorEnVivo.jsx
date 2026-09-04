export default function IndicadorEnVivo() {
  return (
    <span
      style={{
        display: 'inline-block',
        width: '9px',
        height: '9px',
        borderRadius: '50%',
        background: '#349739',
        marginLeft: 'auto',
        boxShadow: '0 0 0 rgba(46, 125, 50, 0.6)',
        animation: 'pulso-verde 1.4s infinite'
      }}
    >
      <style>{`
        @keyframes pulso-verde {
          0% { box-shadow: 0 0 0 0 rgba(46, 125, 50, 0.6); }
          70% { box-shadow: 0 0 0 7px rgba(46, 125, 50, 0); }
          100% { box-shadow: 0 0 0 0 rgba(46, 125, 50, 0); }
        }
      `}</style>
    </span>
  );
}