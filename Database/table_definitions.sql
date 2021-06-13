CREATE DOMAIN PHONE_NUMBER AS TEXT
	-- Regex for international phone numbers from https://stackoverflow.com/questions/2113908/what-regular-expression-will-match-valid-international-phone-numbers
	CHECK (VALUE ~ '\+(9[976]\d|8[987530]\d|6[987]\d|5[90]\d|42\d|3[875]\d|2[98654321]\d|9[8543210]|8[6421]|6[6543210]|5[87654321]|4[987654310]|3[9643210]|2[70]|7|1)\d{1,14}$');

CREATE DOMAIN MD5_32 AS VARCHAR(32)
	CHECK (VALUE ~ '^[a-f0-9]{32}$');

-- Allow up to 10 billion
CREATE DOMAIN CURRENCY AS NUMERIC(12, 2);

CREATE TABLE lender (
	lender_id SERIAL PRIMARY KEY,
	first_name TEXT NOT NULL,
	surname TEXT NOT NULL,
	photo_url TEXT DEFAULT 'users/no_image.png' NOT NULL,  -- Custom icon
	contact_number PHONE_NUMBER
);

CREATE TABLE customer (
	customer_id SERIAL PRIMARY KEY,
	first_name TEXT NOT NULL,
	surname TEXT NOT NULL,
	contact_number PHONE_NUMBER NOT NULL,
	username TEXT NOT NULL UNIQUE,
	password TEXT NOT NULL
);

CREATE TABLE bike (
	bike_id MD5_32 PRIMARY KEY,
	lender_id INTEGER NOT NULL,
	price CURRENCY DEFAULT 25 NOT NULL,
	bike_image TEXT DEFAULT 'img/bikes/no_image.png' NOT NULL,
	available BOOLEAN DEFAULT false NOT NULL,
	brand TEXT DEFAULT 'Unspecified' NOT NULL,
	CHECK (price >= 1 AND price <= 1000),
	FOREIGN KEY (lender_id) REFERENCES lender (lender_id)
		ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE rent_order (
	rent_order_id SERIAL PRIMARY KEY,
	lender_id INTEGER NOT NULL,
	bike_id MD5_32 NOT NULL,
	FOREIGN KEY (lender_id) REFERENCES lender (lender_id)
		ON DELETE RESTRICT ON UPDATE CASCADE,
	FOREIGN KEY (bike_id) REFERENCES bike (bike_id)
		ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE rating (
	rating_id SERIAL PRIMARY KEY,
	bike_id MD5_32 NOT NULL,
	customer_id INTEGER NOT NULL,
	rating INTEGER NOT NULL,
	logged_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
	comment TEXT DEFAULT 'No comment' NOT NULL,
	FOREIGN KEY (bike_id) REFERENCES bike (bike_id)
		ON DELETE RESTRICT ON UPDATE CASCADE,
	FOREIGN KEY (customer_id) REFERENCES customer (customer_id)
		ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Insert a bike with an automatically generated unique hash for the primary key
CREATE OR REPLACE PROCEDURE insert_unique_bike(lender INTEGER, is_available BOOLEAN, image_url TEXT DEFAULT 'img/bikes/no_image.png')
AS $$
DECLARE
	unique_key TEXT;
	attempts_count INTEGER := 0;
	
BEGIN
	LOOP
		-- Create a random hash of 32 characters
		unique_key := LOWER(SUBSTRING(MD5(RANDOM()::TEXT) FOR 32));
		
		BEGIN
			RAISE NOTICE 'Inserted new bike with ID %', unique_key;
			INSERT INTO bike (bike_id, lender_id, available, bike_image) VALUES (unique_key, lender, is_available, image_url);
			EXIT;
		
		-- Try again if it isn't unique
		EXCEPTION WHEN unique_violation THEN
			-- Raise an exception if it has tried more than 5 times
			IF attempts_count > 5 THEN
				RAISE EXCEPTION 'Could not generate unique key after 5 retries';
			END IF;
			
			attempts_count := attempts_count + 1;
		END;
	END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent more than one review being placed on a bike by the same customer
CREATE OR REPLACE FUNCTION check_customer_ratings()
RETURNS TRIGGER AS $$
	DECLARE
		rating_count INTEGER;
	
	BEGIN
		rating_count := (SELECT COUNT(rating_id) FROM rating WHERE bike_id = NEW.bike_id AND customer_id = NEW.customer_id);
		
		IF rating_count > 0 THEN
			RAISE EXCEPTION 'Customer % already has an existing review on bike %', NEW.customer_id, NEW.bike_id;
		END IF;
	END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_customer_ratings
BEFORE INSERT ON rating
FOR EACH ROW
EXECUTE PROCEDURE check_customer_ratings();

-- Function to quickly return the average number of stars a bike has
CREATE OR REPLACE FUNCTION get_number_rating(bike_hash MD5_32)
RETURNS INTEGER AS $$
	BEGIN
		RETURN (SELECT AVG(rating)
		FROM rating
		WHERE bike_id = bike_hash);
	END;
$$ LANGUAGE plpgsql;
