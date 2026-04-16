// frontend/src/PaymentModal.js
// Install: npm install @stripe/react-stripe-js @stripe/stripe-js

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import axios from 'axios';
import './PaymentModal.css';

// 🔑 Replace with your Stripe PUBLISHABLE key
const stripePromise = loadStripe(
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY
);

const API_URL = process.env.REACT_APP_API_URL;

// ─── Card style for Stripe Elements ──────────────────────────────────────────
const CARD_STYLE = {
  style: {
    base: {
      color: '#e8eaf0',
      fontFamily: "'DM Sans', sans-serif",
      fontSize: '15px',
      fontSmoothing: 'antialiased',
      '::placeholder': { color: '#6b7494' },
    },
    invalid: { color: '#f87171', iconColor: '#f87171' },
  },
};

// ─── Inner form (needs to be inside <Elements>) ───────────────────────────────
function CheckoutForm({ student, onSuccess, onClose }) {
  const stripe   = useStripe();
  const elements = useElements();

  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [cardName,     setCardName]     = useState('');
  const [step,         setStep]         = useState('form'); // 'form' | 'success'
  const [receiptData,  setReceiptData]  = useState(null);

  const handlePay = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    if (!cardName.trim()) { setError('Please enter the name on card'); return; }

    setLoading(true);
    setError('');

    try {
      // Step 1 — Get clientSecret from our backend
      const intentRes = await axios.post(`${API_URL}/payments/create-intent`, {
        studentId:   student._id,
        amount:      student.fee,
        studentName: student.name,
        email:       student.email,
        course:      student.course,
      });

      const { clientSecret, paymentIntentId } = intentRes.data;

      // Step 2 — Confirm payment with Stripe
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardNumberElement),
          billing_details: { name: cardName, email: student.email },
        },
      });

      if (result.error) {
        setError(result.error.message);
        setLoading(false);
        return;
      }

      // Step 3 — Tell our backend to save the payment
      await axios.post(`${API_URL}/payments/confirm`, {
        paymentIntentId,
        studentId: student._id,
      });

      setReceiptData({
        name:    student.name,
        course:  student.course,
        amount:  student.fee,
        id:      paymentIntentId.slice(-8).toUpperCase(),
        date:    new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }),
      });
      setStep('success');
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="pm-success">
        <div className="pm-success-icon">✓</div>
        <h2 className="pm-success-title">Payment Successful!</h2>
        <p className="pm-success-sub">A receipt has been sent to <strong>{student.email}</strong></p>
        <div className="pm-receipt">
          <div className="pm-receipt-row"><span>Student</span><span>{receiptData.name}</span></div>
          <div className="pm-receipt-row"><span>Course</span><span>{receiptData.course}</span></div>
          <div className="pm-receipt-row"><span>Amount Paid</span><span className="pm-receipt-amount">₹{Number(receiptData.amount).toLocaleString('en-IN')}</span></div>
          <div className="pm-receipt-row"><span>Date</span><span>{receiptData.date}</span></div>
          <div className="pm-receipt-row"><span>Transaction ID</span><span className="pm-txn-id">#{receiptData.id}</span></div>
        </div>
        <button className="pm-btn-close" onClick={onClose}>Done</button>
      </div>
    );
  }

  return (
    <form onSubmit={handlePay} className="pm-form">
      {/* Amount summary */}
      <div className="pm-summary">
        <div className="pm-summary-info">
          <div className="pm-avatar">{student.name[0].toUpperCase()}</div>
          <div>
            <div className="pm-summary-name">{student.name}</div>
            <div className="pm-summary-course">{student.course}</div>
          </div>
        </div>
        <div className="pm-summary-amount">
          <div className="pm-amount-label">Amount Due</div>
          <div className="pm-amount-value">₹{Number(student.fee).toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* Card fields */}
      <div className="pm-fields">
        <div className="pm-field-group">
          <label className="pm-label">Name on Card</label>
          <input
            type="text"
            className="pm-input"
            placeholder="As printed on card"
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
          />
        </div>

        <div className="pm-field-group">
          <label className="pm-label">Card Number</label>
          <div className="pm-stripe-input">
            <CardNumberElement options={CARD_STYLE} />
          </div>
        </div>

        <div className="pm-field-row">
          <div className="pm-field-group">
            <label className="pm-label">Expiry Date</label>
            <div className="pm-stripe-input">
              <CardExpiryElement options={CARD_STYLE} />
            </div>
          </div>
          <div className="pm-field-group">
            <label className="pm-label">CVV</label>
            <div className="pm-stripe-input">
              <CardCvcElement options={CARD_STYLE} />
            </div>
          </div>
        </div>
      </div>

      {error && <div className="pm-error">⚠️ {error}</div>}

      {/* Test card hint */}
      <div className="pm-test-hint">
        🧪 Test card: <code>4242 4242 4242 4242</code> · Any future date · Any CVV
      </div>

      <button type="submit" className="pm-pay-btn" disabled={loading || !stripe}>
        {loading ? <span className="pm-spinner" /> : '🔒'}
        {loading ? 'Processing...' : `Pay ₹${Number(student.fee).toLocaleString('en-IN')}`}
      </button>

      <div className="pm-secure-note">
        <span>🔐</span> Secured by Stripe · SSL Encrypted
      </div>
    </form>
  );
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────
export default function PaymentModal({ student, onClose, onSuccess }) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="pm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pm-modal">
        <div className="pm-header">
          <div className="pm-header-title">
            <span className="pm-header-icon">💳</span>
            <span>Pay Fee</span>
          </div>
          <button className="pm-close" onClick={onClose}>✕</button>
        </div>
        <Elements stripe={stripePromise}>
          <CheckoutForm student={student} onSuccess={onSuccess} onClose={onClose} />
        </Elements>
      </div>
    </div>
    
  );
}