const db = require('./db');

async function check() {
    try {
        console.log("Altering Rental table...");
        
        // Check if there are any rentals that will violate constraints (e.g., if there are existing rows).
        // Best to just TRUNCATE or wipe existing rentals for simplicity if we are changing schema requirements.
        await db.execute('TRUNCATE TABLE Rental');
        
        await db.execute('ALTER TABLE Rental ADD COLUMN slot_id INT NOT NULL');
        await db.execute('ALTER TABLE Rental ADD CONSTRAINT fk_rental_slot FOREIGN KEY (slot_id) REFERENCES Slot(slot_id) ON DELETE CASCADE');
        await db.execute('ALTER TABLE Rental ADD COLUMN status VARCHAR(20) DEFAULT "active"');
        
        console.log("Success!");
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
