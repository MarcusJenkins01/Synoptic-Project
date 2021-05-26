CREATE DOMAIN PHONE_NUMBER AS TEXT
	-- Regex for international phone numbers from https://stackoverflow.com/questions/2113908/what-regular-expression-will-match-valid-international-phone-numbers
	CHECK (VALUE ~ '\+(9[976]\d|8[987530]\d|6[987]\d|5[90]\d|42\d|3[875]\d|2[98654321]\d|9[8543210]|8[6421]|6[6543210]|5[87654321]|4[987654310]|3[9643210]|2[70]|7|1)\d{1,14}$');

CREATE TABLE lender (
	lender_id SERIAL PRIMARY KEY,
	first_name TEXT NOT NULL,
	surname TEXT NOT NULL,
	photo_url TEXT DEFAULT 'DEFAULT_ICON_URL_HERE',
	contact_number PHONE_NUMBER
);

CREATE TABLE bike (
	bike_id SERIAL PRIMARY KEY,
	lender_id INTEGER NOT NULL,
	FOREIGN KEY (lender_id) REFERENCES lender (lender_id)
		ON DELETE RESTRICT ON UPDATE CASCADE
);
