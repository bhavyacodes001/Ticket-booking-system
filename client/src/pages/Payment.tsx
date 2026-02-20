import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../utils/api';

type BookingDetails = {
  _id: string;
  bookingNumber: string;
  totalAmount: number;
  tickets: Array<{
    seat: { row: string; number: number; type: string; price: number };
    ticketId: string;
  }>;
  movie: { title: string; poster: string };
  theater: { name: string; address: string };
  showDate: string;
  showTime: string;
  status: string;
};

declare global {
  interface Window {
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const Payment: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('bookingId');

  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [razorpayReady, setRazorpayReady] = useState(false);

  useEffect(() => {
    loadRazorpayScript().then(setRazorpayReady);
  }, []);

  useEffect(() => {
    if (!bookingId) {
      setError('No booking ID provided');
      setLoading(false);
      return;
    }
    const fetchBooking = async () => {
      try {
        const res = await api.get(`/bookings/${bookingId}`);
        setBookingDetails(res.data.booking);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load booking details');
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
  }, [bookingId]);

  const handlePay = useCallback(async () => {
    if (!bookingDetails || !razorpayReady) return;
    setProcessing(true);
    setError('');

    try {
      const orderRes = await api.post('/payments/create-order', { bookingId: bookingDetails._id });
      const { orderId, amount, currency, keyId, prefill } = orderRes.data;

      const options = {
        key: keyId,
        amount,
        currency,
        name: 'CineFlix',
        description: `Tickets for ${bookingDetails.movie.title}`,
        order_id: orderId,
        prefill: { name: prefill.name, email: prefill.email },
        theme: { color: '#e50914' },
        handler: async (response: any) => {
          try {
            await api.post('/payments/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              bookingId: bookingDetails._id
            });
            navigate(`/booking-success?bookingId=${bookingDetails._id}`);
          } catch (err: any) {
            setError(err.response?.data?.message || 'Payment verification failed');
            setProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
            setError('Payment was cancelled. You can try again.');
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        setError(`Payment failed: ${response.error.description}`);
        setProcessing(false);
      });
      rzp.open();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create payment order');
      setProcessing(false);
    }
  }, [bookingDetails, razorpayReady, navigate]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', flexDirection: 'column' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>Loading payment details...</div>
      </div>
    );
  }

  if (error && !bookingDetails) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', flexDirection: 'column' }}>
        <div style={{ color: '#e50914', marginBottom: '20px', fontSize: 18 }}>{error}</div>
        <button onClick={() => navigate(-1)} style={{ padding: '10px 20px', background: '#e50914', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          Go Back
        </button>
      </div>
    );
  }

  if (!bookingDetails) return null;

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', marginBottom: '20px', color: '#555' }}>
        &larr; Back
      </button>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 6px 0', color: '#333' }}>Complete Your Payment</h1>
      <p style={{ color: '#666', fontSize: '15px', marginBottom: '30px' }}>Booking #{bookingDetails.bookingNumber}</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        {/* Booking Summary */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '25px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <h2 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: 'bold', color: '#333' }}>Booking Summary</h2>
          <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
            {bookingDetails.movie.poster && (
              <img src={bookingDetails.movie.poster} alt={bookingDetails.movie.title}
                style={{ width: '80px', height: '120px', objectFit: 'cover', borderRadius: '8px' }} />
            )}
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 'bold' }}>{bookingDetails.movie.title}</h3>
              <p style={{ color: '#666', margin: '0 0 5px 0' }}>{bookingDetails.theater.name}</p>
              <p style={{ color: '#666', margin: '0' }}>
                {new Date(bookingDetails.showDate).toLocaleDateString()} at {bookingDetails.showTime}
              </p>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #eee', paddingTop: '20px' }}>
            <h4 style={{ marginBottom: '12px', fontSize: '15px', fontWeight: '600' }}>Selected Seats</h4>
            <div style={{ display: 'grid', gap: '8px', marginBottom: '20px' }}>
              {bookingDetails.tickets.map((ticket, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#f8f9fa', borderRadius: '6px' }}>
                  <span style={{ fontWeight: '500' }}>{ticket.seat.row}{ticket.seat.number} ({ticket.seat.type})</span>
                  <span style={{ color: '#e50914', fontWeight: 'bold' }}>&#8377;{ticket.seat.price}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: '#e50914', color: '#fff', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold' }}>
              <span>Total Amount</span>
              <span>&#8377;{bookingDetails.totalAmount}</span>
            </div>
          </div>
        </div>

        {/* Payment Section */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '25px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <h2 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: 'bold', color: '#333' }}>Payment</h2>

          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '14px', color: '#555', marginBottom: '8px' }}>Powered by Razorpay. Supports:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {['UPI', 'Google Pay', 'PhonePe', 'Cards', 'Net Banking', 'Wallets'].map(m => (
                <span key={m} style={{ padding: '4px 12px', background: '#f0f0f0', borderRadius: '20px', fontSize: '12px', fontWeight: 600, color: '#444' }}>
                  {m}
                </span>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ padding: '12px', background: '#fee', border: '1px solid #fcc', borderRadius: '6px', color: '#c33', marginBottom: '20px', fontSize: '14px' }}>
              {error}
            </div>
          )}

          {!razorpayReady ? (
            <div style={{ padding: '20px', background: '#fff3cd', borderRadius: '8px', color: '#856404', textAlign: 'center' }}>
              Loading payment gateway...
            </div>
          ) : (
            <button onClick={handlePay} disabled={processing}
              style={{
                width: '100%', padding: '16px', border: 'none', borderRadius: '10px', fontSize: '17px',
                fontWeight: 'bold', cursor: processing ? 'not-allowed' : 'pointer', color: '#fff',
                background: processing ? '#aaa' : 'linear-gradient(135deg, #e50914, #b20710)',
                transition: 'all 0.2s ease', boxShadow: processing ? 'none' : '0 4px 15px rgba(229,9,20,0.3)'
              }}>
              {processing ? 'Processing...' : `Pay ₹${bookingDetails.totalAmount}`}
            </button>
          )}

          <div style={{ marginTop: '20px', padding: '12px', background: '#f8f9fa', borderRadius: '8px', fontSize: '12px', color: '#666', textAlign: 'center' }}>
            Your payment is secured by Razorpay. We never store your card details.
          </div>

          <div style={{ marginTop: '16px', padding: '12px', background: '#e8f5e9', borderRadius: '8px', fontSize: '12px', color: '#2e7d32', textAlign: 'center' }}>
            <strong>Test Mode:</strong> Use UPI ID <code>success@razorpay</code> or card <code>4111 1111 1111 1111</code> (any expiry/CVV)
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;
