-- Event ticketing schema. Money is stored in integer minor units.

CREATE TABLE IF NOT EXISTS events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL UNIQUE,
  name          text NOT NULL,
  description   text,
  venue         text NOT NULL,
  starts_at     timestamptz NOT NULL,
  ends_at       timestamptz,
  timezone      text NOT NULL DEFAULT 'Africa/Kampala',
  price_minor   bigint NOT NULL CHECK (price_minor >= 0),
  currency      char(3) NOT NULL,
  capacity      integer NOT NULL CHECK (capacity > 0),
  sold          integer NOT NULL DEFAULT 0 CHECK (sold >= 0),
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bookings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference        text NOT NULL UNIQUE,
  event_id         uuid NOT NULL REFERENCES events(id),
  customer_name    text NOT NULL,
  phone            text NOT NULL,
  email            text NOT NULL,
  quantity         integer NOT NULL CHECK (quantity BETWEEN 1 AND 10),
  unit_price_minor bigint NOT NULL CHECK (unit_price_minor >= 0),
  amount_minor     bigint NOT NULL CHECK (amount_minor >= 0),
  currency         char(3) NOT NULL,
  status           text NOT NULL DEFAULT 'PENDING'
                   CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED')),
  provider         text NOT NULL DEFAULT 'flutterwave',
  provider_ref     text NOT NULL UNIQUE,
  provider_tx_id   text UNIQUE,
  paid_at          timestamptz,
  expires_at       timestamptz NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bookings_event_idx ON bookings (event_id);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings (status);
CREATE INDEX IF NOT EXISTS bookings_expiry_idx ON bookings (expires_at) WHERE status = 'PENDING';

CREATE TABLE IF NOT EXISTS tickets (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  status     text NOT NULL DEFAULT 'VALID' CHECK (status IN ('VALID', 'USED', 'VOID')),
  issued_at  timestamptz NOT NULL DEFAULT now(),
  used_at    timestamptz
);

CREATE TABLE IF NOT EXISTS scan_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   uuid REFERENCES tickets(id) ON DELETE SET NULL,
  token_hash  text,
  result      text NOT NULL CHECK (result IN ('VALID', 'ALREADY_USED', 'INVALID', 'UNPAID')),
  staff_label text,
  scanned_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scan_logs_time_idx ON scan_logs (scanned_at DESC);

CREATE TABLE IF NOT EXISTS delivery_outbox (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  channel    text NOT NULL,
  status     text NOT NULL DEFAULT 'PENDING'
             CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'SKIPPED')),
  attempts   integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at    timestamptz
);

CREATE INDEX IF NOT EXISTS delivery_outbox_booking_idx ON delivery_outbox (booking_id);
