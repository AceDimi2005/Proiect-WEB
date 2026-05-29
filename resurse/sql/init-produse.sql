DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'techforge_app') THEN
        CREATE ROLE techforge_app LOGIN PASSWORD 'techforge_app';
    END IF;
END $$;

SELECT 'CREATE DATABASE proiect OWNER techforge_app'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'proiect')\gexec

\connect proiect

DO $$
BEGIN
    DROP TABLE IF EXISTS asociere_set;
    DROP TABLE IF EXISTS seturi;
    DROP TABLE IF EXISTS produse;
    DROP TYPE IF EXISTS categorie_produs;
    CREATE TYPE categorie_produs AS ENUM (
        'pc_gaming',
        'pc_birou',
        'pc_workstation',
        'laptop_gaming',
        'laptop_business'
    );
END $$;

CREATE TABLE produse (
    id INTEGER PRIMARY KEY,
    nume VARCHAR(120) NOT NULL,
    descriere TEXT NOT NULL,
    imagine VARCHAR(255) NOT NULL,
    categorie categorie_produs NOT NULL,
    tip_produs VARCHAR(60) NOT NULL,
    segment VARCHAR(60) NOT NULL,
    pret NUMERIC(9, 2) NOT NULL CHECK (pret >= 0),
    greutate_g INTEGER NOT NULL CHECK (greutate_g > 0),
    data_adaugare DATE NOT NULL,
    culoare VARCHAR(40) NOT NULL,
    conectivitate TEXT NOT NULL,
    in_stoc BOOLEAN NOT NULL DEFAULT TRUE,
    brand VARCHAR(60) NOT NULL,
    garantie_luni INTEGER NOT NULL CHECK (garantie_luni > 0),
    specificatii TEXT NOT NULL
);

INSERT INTO produse (
    id, nume, descriere, imagine, categorie, tip_produs, segment, pret,
    greutate_g, data_adaugare, culoare, conectivitate, in_stoc, brand,
    garantie_luni, specificatii
) VALUES
(1, 'TechForge Apex RTX 4070', 'PC de gaming echilibrat pentru 1440p, streaming si jocuri competitive, cu racire silentioasa si iluminare RGB discreta.', '/resurse/imagini/poze/mic/rgb-desktop-computer-setup-cc0.webp', 'pc_gaming', 'pc_gaming', 'gaming', 8499.90, 11800, '2025-11-10', 'negru', 'USB-C, HDMI, DisplayPort, Ethernet, Wi-Fi, RGB', TRUE, 'TechForge', 36, 'AMD Ryzen 7 7800X3D, RTX 4070, 32GB DDR5, SSD NVMe 2TB, racire lichida 240mm'),
(2, 'TechForge Nova RX 7600', 'PC de gaming accesibil pentru Full HD, cu airflow bun si componente usor de actualizat.', '/resurse/imagini/poze/mic/gaming-computers-las-vegas-ccby2.webp', 'pc_gaming', 'pc_gaming', 'gaming', 4899.00, 9600, '2025-09-14', 'negru', 'USB-A, USB-C, HDMI, DisplayPort, Ethernet, Wi-Fi, RGB', TRUE, 'TechForge', 36, 'AMD Ryzen 5 7600, Radeon RX 7600, 16GB DDR5, SSD NVMe 1TB, sursa 650W Bronze'),
(3, 'TechForge Titan RTX 4080 Super', 'PC high-end pentru gaming 4K, VR si streaming, construit cu sursa eficienta si carcasa premium.', '/resurse/imagini/poze/mic/two-gaming-pcs-ccby4.webp', 'pc_gaming', 'pc_gaming', 'gaming', 13999.00, 14200, '2025-12-03', 'alb', 'USB-C, HDMI, DisplayPort, Ethernet, Wi-Fi, Bluetooth, RGB', TRUE, 'TechForge', 36, 'Intel Core i9, RTX 4080 Super, 64GB DDR5, SSD NVMe 4TB, racire lichida 360mm'),
(4, 'TechForge Office i5 Compact', 'PC de birou rapid pentru documente, videoconferinte si aplicatii administrative, cu consum redus.', '/resurse/imagini/poze/mic/setup-mare.webp', 'pc_birou', 'pc_office', 'birou', 2999.00, 6200, '2025-06-18', 'negru', 'USB-A, USB-C, HDMI, Ethernet, Wi-Fi', TRUE, 'TechForge', 36, 'Intel Core i5, grafica integrata, 16GB DDR5, SSD NVMe 1TB, carcasa compacta'),
(5, 'TechForge MiniDesk Ryzen', 'Mini PC pentru spatii mici, potrivit pentru lucru hibrid, browsing si aplicatii office.', '/resurse/imagini/poze/mic/laptop-on-a-desk-cc0.webp', 'pc_birou', 'mini_pc', 'birou', 2499.90, 1800, '2025-05-25', 'gri', 'USB-C, HDMI, Ethernet, Wi-Fi, Bluetooth', TRUE, 'TechForge', 24, 'AMD Ryzen 5, grafica Radeon integrata, 16GB RAM, SSD 512GB, suport VESA'),
(6, 'TechForge Silent Pro i7', 'PC silentios pentru birou si multitasking, cu carcasa antifonata si racire optimizata.', '/resurse/imagini/poze/mic/pakata-goh-RDolnHtjVCY-unsplash.webp', 'pc_birou', 'pc_office', 'birou', 4299.99, 7800, '2025-08-07', 'negru', 'USB-A, USB-C, HDMI, DisplayPort, Ethernet, Wi-Fi', FALSE, 'TechForge', 36, 'Intel Core i7, 32GB DDR5, SSD NVMe 1TB, sursa 80+ Gold, ventilatoare silentioase'),
(7, 'TechForge Studio Pro i9', 'PC workstation pentru editare video, randare si proiecte creative cu fisiere mari.', '/resurse/imagini/poze/mic/olivier-collet-JMwCe3w7qKk-unsplash.webp', 'pc_workstation', 'pc_workstation', 'creatie', 11999.00, 13600, '2025-10-01', 'alb', 'USB-C, Thunderbolt, HDMI, DisplayPort, Ethernet, Wi-Fi, Bluetooth', TRUE, 'TechForge', 36, 'Intel Core i9, RTX 4070 Ti Super, 64GB DDR5, SSD NVMe 4TB, placa de baza Z790'),
(8, 'TechForge Render Ryzen 9', 'Workstation pentru modelare 3D, randare CPU si proiecte CAD cu multe aplicatii deschise.', '/resurse/imagini/poze/mic/olivier-collet-VDGBFiaM6Cs-unsplash.webp', 'pc_workstation', 'pc_workstation', 'creatie', 10499.50, 12900, '2025-09-22', 'negru', 'USB-A, USB-C, HDMI, DisplayPort, Ethernet, Wi-Fi', TRUE, 'TechForge', 36, 'AMD Ryzen 9 7950X, RTX 4070, 64GB DDR5, SSD NVMe 2TB, HDD 4TB'),
(9, 'TechForge DataStation Threadripper', 'Workstation masiv pentru randari lungi, virtualizare si fluxuri profesionale de date.', '/resurse/imagini/poze/mic/anthony-roberts-5WJhuXkqCkc-unsplash.webp', 'pc_workstation', 'pc_workstation', 'creatie', 18999.00, 15800, '2025-12-15', 'gri', 'USB-C, Thunderbolt, Ethernet, Wi-Fi, Bluetooth, DisplayPort', FALSE, 'TechForge', 48, 'AMD Threadripper, RTX 4080, 128GB DDR5 ECC, SSD NVMe 8TB, sursa 1200W Platinum'),
(10, 'ASUS ROG Strix G16', 'Laptop de gaming cu ecran rapid, racire eficienta si tastatura RGB pentru sesiuni lungi.', '/resurse/imagini/poze/mic/harshit-suryawanshi-H9JMjJlgZrw-unsplash.webp', 'laptop_gaming', 'laptop_gaming', 'gaming', 7499.00, 2500, '2025-07-19', 'gri', 'USB-C, HDMI, Wi-Fi, Bluetooth, Ethernet, RGB', TRUE, 'ASUS', 24, 'Intel Core i7, RTX 4060, 32GB RAM, SSD 1TB, ecran 16 inch 165Hz'),
(11, 'Lenovo Legion Pro 5', 'Laptop de gaming performant pentru jocuri competitive si creatie usoara, cu profil termic stabil.', '/resurse/imagini/poze/mic/olivier-collet-JMwCe3w7qKk-unsplash.webp', 'laptop_gaming', 'laptop_gaming', 'gaming', 8299.99, 2550, '2025-09-05', 'negru', 'USB-C, HDMI, Wi-Fi, Bluetooth, Ethernet, RGB', TRUE, 'Lenovo', 24, 'AMD Ryzen 7, RTX 4070, 32GB RAM, SSD 1TB, ecran QHD 240Hz'),
(12, 'Acer Nitro V 15', 'Laptop de gaming entry-level pentru jocuri Full HD, cursuri si streaming ocazional.', '/resurse/imagini/poze/mic/artin-bakhan-SqLyNHbsLKQ-unsplash.webp', 'laptop_gaming', 'laptop_gaming', 'gaming', 4599.90, 2100, '2025-06-11', 'negru', 'USB-C, HDMI, Wi-Fi, Bluetooth, Ethernet', TRUE, 'Acer', 24, 'Intel Core i5, RTX 4050, 16GB RAM, SSD 512GB, ecran 15.6 inch 144Hz'),
(13, 'Dell Latitude 5450', 'Laptop business robust pentru lucru zilnic, sedinte online si administrare documente.', '/resurse/imagini/poze/mic/laptop-on-a-desk-cc0.webp', 'laptop_business', 'laptop_business', 'birou', 4499.00, 1540, '2025-05-30', 'gri', 'USB-C, HDMI, Wi-Fi, Bluetooth, Ethernet', TRUE, 'Dell', 36, 'Intel Core Ultra 5, 16GB RAM, SSD 512GB, camera FHD, cititor amprenta'),
(14, 'HP EliteBook 840 G11', 'Laptop business premium cu securitate hardware, autonomie buna si carcasa usoara.', '/resurse/imagini/poze/mic/ella-don-Ie9BekWw_Uk-unsplash.webp', 'laptop_business', 'laptop_business', 'birou', 5999.99, 1410, '2025-08-25', 'argintiu', 'USB-C, Thunderbolt, HDMI, Wi-Fi, Bluetooth', TRUE, 'HP', 36, 'Intel Core Ultra 7, 32GB RAM, SSD 1TB, display 14 inch, tastatura iluminata'),
(15, 'Lenovo ThinkPad T14 Gen 5', 'Laptop business rezistent pentru programare, analiza si lucru mobil intens.', '/resurse/imagini/poze/mic/joseph-greve-BPJKc4r7_eo-unsplash.webp', 'laptop_business', 'laptop_business', 'mobilitate', 6499.00, 1360, '2025-10-12', 'negru', 'USB-C, Thunderbolt, HDMI, Wi-Fi, Bluetooth, Ethernet', TRUE, 'Lenovo', 36, 'AMD Ryzen 7 Pro, 32GB RAM, SSD 1TB, tastatura rezistenta la stropire'),
(16, 'ASUS Zenbook 14 OLED', 'Laptop ultrabook pentru mobilitate, prezentari si lucru creativ usor, cu ecran OLED luminos.', '/resurse/imagini/poze/mic/olivier-collet-VDGBFiaM6Cs-unsplash.webp', 'laptop_business', 'laptop_ultrabook', 'mobilitate', 5299.00, 1280, '2025-09-22', 'albastru', 'USB-C, HDMI, Wi-Fi, Bluetooth', TRUE, 'ASUS', 24, 'Intel Core Ultra 7, 16GB RAM, SSD 1TB, ecran OLED 14 inch, incarcare USB-C'),
(17, 'Apple MacBook Air 13 M3', 'Laptop subtire pentru lucru mobil, autonomie mare si aplicatii office sau multimedia.', '/resurse/imagini/poze/mic/hudson-mcnamara-nkVlp_owMks-unsplash.webp', 'laptop_business', 'laptop_ultrabook', 'mobilitate', 5799.00, 1240, '2025-04-16', 'argintiu', 'USB-C, Thunderbolt, Wi-Fi, Bluetooth', FALSE, 'Apple', 24, 'Apple M3, 16GB memorie unificata, SSD 512GB, ecran Liquid Retina 13.6 inch'),
(18, 'TechForge LearnBook 15', 'Laptop accesibil pentru scoala, facultate si lucru de baza, cu tastatura comoda si upgrade simplu.', '/resurse/imagini/poze/mic/bhautik-patel-GYj9ts-qvlQ-unsplash.webp', 'laptop_business', 'laptop_business', 'studiu', 2799.90, 1680, '2025-07-02', 'gri', 'USB-A, USB-C, HDMI, Wi-Fi, Bluetooth', TRUE, 'TechForge', 24, 'Intel Core i5, 16GB RAM, SSD 512GB, ecran 15.6 inch, webcam FHD');

CREATE TABLE seturi (
    id INTEGER PRIMARY KEY,
    nume_set VARCHAR(120) NOT NULL,
    descriere_set TEXT NOT NULL
);

CREATE TABLE asociere_set (
    id INTEGER PRIMARY KEY,
    id_set INTEGER NOT NULL REFERENCES seturi(id) ON DELETE CASCADE,
    id_produs INTEGER NOT NULL REFERENCES produse(id) ON DELETE CASCADE,
    UNIQUE (id_set, id_produs)
);

INSERT INTO seturi (id, nume_set, descriere_set) VALUES
(1, 'Pachet Gaming Duo', 'Un desktop puternic si un laptop gaming pentru utilizatorii care vor performanta si acasa, si in deplasare.'),
(2, 'Birou Compact Start', 'Set pentru birou sau studiu: PC compact, laptop business si laptop accesibil pentru lucru zilnic.'),
(3, 'Studio Creatie Pro', 'Set pentru editare, randare si prezentari: doua workstation-uri si un ultrabook OLED.'),
(4, 'Business Mobility', 'Set pentru echipe mobile, cu laptopuri business robuste si usor de transportat.'),
(5, 'Ultimate Performance Lab', 'Set premium pentru gaming 4K, randari grele si testare de performanta.');

INSERT INTO asociere_set (id, id_set, id_produs) VALUES
(1, 1, 1),
(2, 1, 10),
(3, 1, 11),
(4, 2, 4),
(5, 2, 13),
(6, 2, 18),
(7, 3, 7),
(8, 3, 8),
(9, 3, 16),
(10, 4, 13),
(11, 4, 14),
(12, 4, 15),
(13, 4, 17),
(14, 5, 3),
(15, 5, 9),
(16, 5, 11);

ALTER TABLE produse OWNER TO techforge_app;
ALTER TABLE seturi OWNER TO techforge_app;
ALTER TABLE asociere_set OWNER TO techforge_app;
GRANT CONNECT ON DATABASE proiect TO techforge_app;
GRANT USAGE ON SCHEMA public TO techforge_app;
GRANT USAGE ON TYPE categorie_produs TO techforge_app;
GRANT SELECT ON TABLE produse TO techforge_app;
GRANT SELECT ON TABLE seturi TO techforge_app;
GRANT SELECT ON TABLE asociere_set TO techforge_app;
