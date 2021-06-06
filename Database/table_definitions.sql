CREATE DOMAIN PHONE_NUMBER AS TEXT
	-- Regex for international phone numbers from https://stackoverflow.com/questions/2113908/what-regular-expression-will-match-valid-international-phone-numbers
	CHECK (VALUE ~ '\+(9[976]\d|8[987530]\d|6[987]\d|5[90]\d|42\d|3[875]\d|2[98654321]\d|9[8543210]|8[6421]|6[6543210]|5[87654321]|4[987654310]|3[9643210]|2[70]|7|1)\d{1,14}$');

CREATE DOMAIN MD5_32 AS VARCHAR(32)
	CHECK (VALUE ~ '^[a-f0-9]{32}$');

CREATE TABLE lender (
	lender_id SERIAL PRIMARY KEY,
	first_name TEXT NOT NULL,
	surname TEXT NOT NULL,
	photo_url TEXT DEFAULT 'https://cdn.discordapp.com/attachments/337688298078208001/847389356343427082/unknown.png',  -- Custom icon
	contact_number PHONE_NUMBER
);

CREATE TABLE customer (
	customer_id SERIAL PRIMARY KEY,
	first_name TEXT NOT NULL,
	surname TEXT NOT NULL,
	contact_number PHONE_NUMBER
);

CREATE TABLE bike (
	bike_id MD5_32 PRIMARY KEY,
	lender_id INTEGER NOT NULL,
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


CREATE OR REPLACE PROCEDURE insert_unique_bike(lender INTEGER)
AS $$
DECLARE
	unique_key TEXT;
	attempts_count INTEGER := 0;
	
BEGIN
	LOOP
		-- Create a random hash of 32 characters
		unique_key := LOWER(SUBSTRING(MD5(RANDOM()::TEXT) FOR 32));
		
		BEGIN
			RAISE NOTICE '%', unique_key;
			INSERT INTO bike (bike_id, lender_id) VALUES (unique_key, lender);
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
