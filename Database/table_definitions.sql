CREATE DOMAIN PHONE_NUMBER AS TEXT
	-- Regex for international phone numbers from https://stackoverflow.com/questions/2113908/what-regular-expression-will-match-valid-international-phone-numbers
	CHECK (VALUE ~ '\+(9[976]\d|8[987530]\d|6[987]\d|5[90]\d|42\d|3[875]\d|2[98654321]\d|9[8543210]|8[6421]|6[6543210]|5[87654321]|4[987654310]|3[9643210]|2[70]|7|1)\d{1,14}$');

CREATE DOMAIN MD5_32 AS VARCHAR(32)
	CHECK (VALUE ~ '^[a-f0-9]{32}$');

-- Allows money up to 10 billion to be stored
CREATE DOMAIN CURRENCY AS NUMERIC(12, 2);

CREATE DOMAIN RATING_1TO5 AS INTEGER
	CHECK (VALUE >= 1 AND VALUE <= 5);

CREATE TABLE lender (
	lender_id SERIAL PRIMARY KEY,
	first_name TEXT NOT NULL,
	surname TEXT NOT NULL,
	photo_url TEXT DEFAULT 'img/users/no_image.png' NOT NULL,  -- Custom icon
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
	latitude NUMERIC (9, 7) NOT NULL,
	longitude NUMERIC(10, 7) NOT NULL,
	CHECK (price >= 1 AND price <= 1000),
	FOREIGN KEY (lender_id) REFERENCES lender (lender_id)
		ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE rating (
	rating_id SERIAL PRIMARY KEY,
	bike_id MD5_32 NOT NULL,
	customer_id INTEGER NOT NULL,
	rating RATING_1TO5 NOT NULL,
	logged_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
	comment TEXT DEFAULT 'No comment' NOT NULL,
	FOREIGN KEY (bike_id) REFERENCES bike (bike_id)
		ON DELETE RESTRICT ON UPDATE CASCADE,
	FOREIGN KEY (customer_id) REFERENCES customer (customer_id)
		ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE lender_rating (
	lender_rating_id SERIAL PRIMARY KEY,
	lender_id INTEGER NOT NULL,
	customer_id INTEGER NOT NULL,
	rating RATING_1TO5 NOT NULL,
	logged_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
	comment TEXT DEFAULT 'No comment' NOT NULL,
	FOREIGN KEY (lender_id) REFERENCES lender (lender_id)
		ON DELETE RESTRICT ON UPDATE CASCADE,
	FOREIGN KEY (customer_id) REFERENCES customer (customer_id)
		ON DELETE RESTRICT ON UPDATE CASCADE
);


-- Insert a bike with an automatically generated unique hash for the primary key
CREATE OR REPLACE PROCEDURE insert_unique_bike(lender INTEGER, price_per_hour CURRENCY, image_url TEXT DEFAULT 'img/bikes/no_image.png', is_available BOOLEAN, brand_name TEXT, gps_latitude NUMERIC(9, 7), gps_longitude NUMERIC(10, 7))
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
			INSERT INTO bike (bike_id, lender_id, price, bike_image, available, brand, latitude, longitude) VALUES (unique_key, lender, price_per_hour, image_url, is_available, brand_name, gps_latitude, gps_longitude);
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
		ELSE
			RETURN NEW;
		END IF;
	END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_customer_ratings
BEFORE INSERT ON rating
FOR EACH ROW
EXECUTE PROCEDURE check_customer_ratings();


-- Trigger to prevent more than one review being placed on a lender by the same customer
CREATE OR REPLACE FUNCTION check_customer_lender_ratings()
RETURNS TRIGGER AS $$
	DECLARE
		rating_count INTEGER;
	
	BEGIN
		rating_count := (SELECT COUNT(lender_rating_id) FROM lender_rating WHERE lender_id = NEW.lender_id AND customer_id = NEW.customer_id);
		
		IF rating_count > 0 THEN
			RAISE EXCEPTION 'Customer % already has an existing review on lender %', NEW.customer_id, NEW.lender_id;
		ELSE
			RETURN NEW;
		END IF;
	END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_customer_lender_ratings
BEFORE INSERT ON lender_rating
FOR EACH ROW
EXECUTE PROCEDURE check_customer_lender_ratings();


-- Function to quickly return the average number of stars a bike has
CREATE OR REPLACE FUNCTION get_number_rating(bike_hash MD5_32)
RETURNS INTEGER AS $$
	BEGIN
		RETURN (SELECT COALESCE(AVG(rating), 0)
		FROM rating
		WHERE bike_id = bike_hash);
	END;
$$ LANGUAGE plpgsql;
