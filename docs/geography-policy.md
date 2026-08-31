# Geography display and source policy

Last verified: 2026-08-29

## Product-owned display strings

The public UI and imported data normalize the following locations exactly as
specified by the product owner:

- `Hong Kong SAR, China`
- `Macau SAR, China`
- `Taiwai, China`

The last spelling is intentional and must not be silently corrected. Runtime
normalization is owned by `src/lib/location-policy.ts`; DOCX rebuild and bundled
JSON normalization are owned by `scripts/build_cpgis_demo_data.py`.

## Verified Hong Kong institution overrides

The override is selected deterministically from the normalized organization
name and is applied before ROR/Nominatim lookup, so a rebuild cannot collapse the
institutions back onto a shared city centroid.

| Institution match | Display city | Marker used | Verification source |
|---|---|---:|---|
| The University of Hong Kong | Pok Fu Lam | `22.2831742305872, 114.134704281723` | The [HKU Geography contact page](https://geog.hku.hk/contact) identifies 10/F, The Jockey Club Tower, Centennial Campus, Pokfulam Road. HKU's [official campus-map record](http://www.maps.hku.hk/getlocationjson.php?id=76&type=Department) returns that department marker. |
| The Chinese University of Hong Kong | Sha Tin | `22.415219, 114.208674` | The [CUHK GRM contact page](https://www.grm.cuhk.edu.hk/en/about/contact/) identifies 2/F, Wong Foo Yuan Building, Shatin and its official Google Map link carries this map centre. |
| The Hong Kong Polytechnic University | Hung Hom | `22.306436, 114.179501` | The [PolyU LSGS contact page](https://www.polyu.edu.hk/lsgs/about-lsgi/contact-us/) identifies Room ZS621, Block Z, 181 Chatham Road South. The university's [public campus-map POI feed](https://www.polyu.edu.hk/public-data/POIs?channel=campus-map&category=AcademicOffice) publishes this marker for record `5bcd3714520471ab6eaf5735`. |

These are department/building markers, not parcel boundaries or postal-address
geocodes. A future campus-specific job should add a narrower reviewed override
rather than changing a university-wide override for every record.

## Verified University of York override

Organizations containing the exact word order `University of York` are mapped
to the main Heslington campus at `53.9484189, -1.0535445`, with the public label
`York, United Kingdom`. The [University's official contact page](https://www.york.ac.uk/about/contact/)
identifies its main campus as University of York, Heslington, York, YO10 5DD,
United Kingdom. The coordinate is the postcode point published for the same
institution and address in the UK Government's
[Get Information about Schools record](https://get-information-schools.service.gov.uk/Establishments/Establishment/Details/133913)
(easting 462215, northing 450672), converted to WGS84 as
`53.9484189, -1.0535445`. This is a
conservative campus-level marker rather than a claim about the job's building.

The matcher intentionally does not include the reversed name `York University`,
which refers to the institution in Toronto, and it cannot match `New York
University`.

## Verified University of Augsburg override

Organizations containing the exact name `University of Augsburg` are mapped to
`Augsburg, Germany` at the university campus point `48.37154, 10.89851`. This
prevents a generic `Institute of Geography` department string from resolving to
the unrelated institute in Almaty. The stored campus address is University of
Augsburg, Universitaetsstrasse 2, 86159 Augsburg, Germany.

The reversed name `Augsburg University` is not matched generically because it
can refer to the institution in Minnesota. The one current German record using
that word order is covered only through its full, specific chair-group name.

## Institution-first geocoding audit

The 555 bundled records were audited after Cornell University was found at
Koronadal, Philippines. The cached ROR affiliation match had preferred the
generic phrase `Department of Natural Resources and Environment` over the
institution name at the end of the organization string. The same failure mode
placed departments from several other universities at unrelated organizations.

For reviewed institutions, a normalized organization-name or exact application
URL match now takes precedence over cached ROR/Nominatim output. Current
deterministic overrides cover Cornell University, the University of Victoria
Department of Geography, ENS Paris Geosciences, campus-specific Aarhus
University jobs, UCL CASA/Bartlett Architecture/CEGE, Lancaster Medical School,
Radboud University, Newcastle University, University of Plymouth, University of
Washington Tacoma, Queensland University of Technology, Western Sydney
University campus-specific jobs, INRAE UMR TETIS, Chalmers University of Technology,
University of Amsterdam, University of Vienna, Potsdam Institute for Climate
Impact Research, Leibniz Institute for Baltic Sea Research Warnemuende, Alfred
Wegener Institute, ETH Zurich, University at Buffalo, University of Gothenburg,
University of Bergen, Northeastern University, University of St. Gallen, UT
Southwestern Medical Center, University of Oxford, University of Toronto
Mississauga, Rutgers CAIT, OpenGeoHub Foundation, Leibniz ZMT, the Royal
Geographical Society, and three location-specific CNRS units (LETG Rennes, EVS
Lyon, and EPOC Pessac). Tests require every bundled record matching those names
to use the reviewed city, country, and campus point. The Amsterdam matcher
explicitly excludes `Free University of Amsterdam` so it cannot move a separate
institution by substring.

Two further ambiguous-name failures are now covered explicitly. The current
University of Victoria record matches the complete `Department of Geography,
University of Victoria` affiliation and uses the David Turpin Building marker
in Victoria, British Columbia; the university's [Geography office page](https://www.uvic.ca/socialsciences/geography/faculty-staff/index.php)
places the office in room B203 of that building, and its [building directory](https://www.uvic.ca/search/buildings/pages/david-turpin.php)
confirms that the building contains the Department of Geography. It must not be
matched to the unrelated Victoria University in Uganda. The current ENS record
matches the complete Paris geosciences affiliation and uses the department
building at 24 rue Lhomond; the [ENS Geosciences contact page](https://www.geosciences.ens.fr/departement/acces-contact)
and [ENS department page](https://www.ens.psl.eu/departement/departement-de-geosciences)
both identify that Paris address. The short token `ENS` is intentionally not a
global alias because institutions bearing that abbreviation exist in multiple
countries.

## Repeated-world map behavior

The public and single-job Leaflet maps enable `worldCopyJump`. The English
vector basemap can repeat horizontally past the antimeridian, while Leaflet
vector overlays such as job markers and the ten-dash line otherwise remain only
in their original world copy. Recentring transparently onto the canonical world
copy after a cross-world pan keeps the basemap and overlays synchronized whether
the user explores westward or eastward.

The Aarhus records are intentionally not covered by one university-wide point.
The 14 current jobs resolve to Aarhus (8), Roskilde (4), Herning (1), and
Slagelse/Flakkebjerg (1), using the department and, where a department spans
sites, the exact application URL. Official references include the Aarhus
University [Environmental Science contact page](https://envs.au.dk/en/about-the-department/contactthedepartment)
for Frederiksborgvej 399 in Roskilde and the
[BTECH organization page](https://btech.au.dk/en/organisation) for Birk
Centerpark 15 in Herning.

The same institution-first review corrected additional high-confidence name
collisions: Newcastle University in the United Kingdom was no longer confused
with the University of Newcastle in Australia; University of Plymouth was no
longer confused with Plymouth State University; Radboud University was no
longer confused with Radford University; and Lancaster Medical School was no
longer assigned to Lancaster University Ghana. Supporting official pages include
[Newcastle APL](https://research.ncl.ac.uk/isapl2015/contactus/),
[Plymouth Biological and Marine Sciences](https://www.plymouth.ac.uk/schools/school-of-biological-and-marine-sciences),
[Nijmegen School of Management](https://www.ru.nl/en/about-us/organisation/faculties/nsm),
and [Lancaster Medical School](https://www.lancaster.ac.uk/lms/about-us/general-enquiries/index.php).

UCL records now use reviewed unit-level addresses rather than an unrelated UCL
unit returned by ROR: CASA uses
[Maple House](https://www.ucl.ac.uk/bartlett/casa/about), Bartlett Architecture
uses [22 Gordon Street](https://www.ucl.ac.uk/bartlett/architecture/about/contact-us),
and CEGE uses the
[Chadwick Building](https://www.ucl.ac.uk/engineering/civil-environmental-geomatic-engineering/about).
The INRAE remote-sensing record uses the official
[UMR TETIS Montpellier address](https://annuaire.inrae.fr/structure/1470).
Western Sydney records use the employer's named Engineering Innovation Hub or a
conservative School of Social Sciences campus point; the official sources place
the [Innovation Hub at 6 Hassall Street](https://www.westernsydney.edu.au/news-centre/stories/2022/doors-officially-open-on-state-of-the-art-engineering-innovation-hub-in-parramatta)
and publish the [Parramatta South campus GPS point](https://www.westernsydney.edu.au/__data/assets/pdf_file/0017/2050451/WSU_Emergency_Services_Campus_Access.pdf).

A second low-overlap audit of organization names against resolved institutions
found and corrected five further city/country errors. The original Texas A&M
recruitment link identifies College Station; the generic department name is now
covered by that exact application URL. CNRS unit records use their actual sites:
[LIENSs UMR 7266 in La Rochelle](https://lienss.univ-larochelle.fr/How-to-contact-us),
[LIVE UMR 7362 in Strasbourg](https://live.unistra.fr/live/organigramme),
[IDEES UMR 6266 in Mont-Saint-Aignan](https://umr-idees.fr/annuaire/joel-colloc?tab=3),
and [CNRS@CREATE in Singapore](https://www.cnrsatcreate.cnrs.fr/contact/).
University College Dublin records now use its Belfield campus instead of the
separate UCD Foundation organization record.

For new, non-overridden records, the ROR affiliation endpoint is fail-closed:
the importer accepts only an item explicitly marked `chosen: true`. It never
automatically selects the first interactive-query result. If ROR does not choose
a match, the importer falls back to the institution-oriented address query. A
Python policy test exercises the matcher directly, including negative substring
cases and the ROR fallback, so correctness does not depend only on the current
generated JSON.

Campus addresses were checked against official institution contact pages,
including [Cornell](https://www.cornell.edu/about/locations/ithaca/),
[IOW](https://www.io-warnemuende.de/contact.html),
[AWI](https://www.awi.de/impressum.html),
[University at Buffalo](https://www.buffalo.edu/?pageVersion=1),
[University of Gothenburg](https://www.gu.se/en/contact),
[University of Bergen](https://www4.uib.no/en/about-uib/about-the-university/contact),
[Northeastern](https://cssh.northeastern.edu/crj/contact/),
[University of St. Gallen](https://www.unisg.ch/en/data-protection-declaration/),
[UT Southwestern](https://www.utsouthwestern.edu/about-us/contact-us/),
[University of Toronto Mississauga](https://www.utm.utoronto.ca/geography/),
[Rutgers CAIT](https://cait.rutgers.edu/directory/patrick-szary/),
[OpenGeoHub](https://opengeohub.org/contact-us/),
[Oxford SoGE](https://www.geog.ox.ac.uk/impact/index.html),
[Royal Geographical Society](https://www.rgs.org/about-us/visit-us),
[EVS](https://umr5600.cnrs.fr/fr/infos-pratiques/acces-et-contacts/), and
[EPOC](https://www.epoc.u-bordeaux.fr/index.php?id=apryet&lang=en&page=fiche_permanents).
Coordinates are conservative campus/address points rather than claims about a
specific office or job building.

## South China Sea ten-dash layer

The product owner supplied two local geodata packages for this requirement:

- `2024-04-01 中国标准地图-审图号GS(2020)4619号-shp格式.zip`;
- `2024-11-27 李杨 - 九段线.rar`.

For provenance and future byte-for-byte verification, their SHA-256 digests are:

- `2024-04-01 中国标准地图-审图号GS(2020)4619号-shp格式.zip` — `b111ecc2ccbefa4afc8bc8f9a79117c6b6dc5e233d7710edcfe8c381101c4555`;
- `2024-11-27 李杨 - 九段线.rar` — `7dc39df5644c1f65e3aed2df176684bda869c4d8e9dc77cf128ff1f1b8b4f73d`;
- generated `src/data/china-ten-dash-line.json` — `40cc5e2365f618ae6b57de034adfa8a49e3bb467e12409f3a008b1e6e0f2895f`.

The second package's filename says 九段线, but its data contract is unambiguous:
it contains ten WGS84 `LineString` features, every feature has `GBCODE=61010`,
and every `备注` value is `十段线`. The implementation therefore calls the
result the **South China Sea ten-dash line** rather than repeating the archive
filename.

The ten source segment identifiers are `691`, `937`, `975`, `1073`, `1079`,
`1086`, `1106`, `1362`, `1367`, and `1382`. All ten identifiers and geometries
have counterparts in the `国界线` layer of the supplied GS(2020)4619 standard
map. After conversion of the reviewed Beijing 1954 Lambert source to WGS84,
nine newer segments are within about 100 metres of the reviewed reference. The
segment east of Taiwan (`691`) differs by about 3.4 kilometres. Per the product
owner's instruction, the newer, explicitly labelled WGS84 ten-dash geometry is
the displayed geometry; GS(2020)4619 is retained as the review reference.

`scripts/build_south_china_sea_layer.py` validates those invariants and emits
`src/data/china-ten-dash-line.json` as a GeoJSON FeatureCollection. The web layer is non-interactive, sits
above the English basemap and below job markers, uses a theme-aware solid
stroke, and appears on both the public map and individual job maps. The map
attribution records the supplied WGS84 source and the GS(2020)4619 reference.

No private workstation path or source metadata is committed. The original
archives remain outside the repository. Production publication and any map
review or approval-number display obligations remain the product owner's
release responsibility; the requested ten-dash geometry is implemented in the
application rather than being hand-drawn or inferred from community data.
