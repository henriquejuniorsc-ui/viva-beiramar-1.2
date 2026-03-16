const TYPE_MAP = {
  'Casa': 'Residential / Home',
  'Apartamento': 'Residential / Apartment',
  'Terreno': 'Residential / Land Lot',
  'Sobrado': 'Residential / Home',
  'Chácara': 'Residential / Farm Ranch',
  'Cobertura': 'Residential / Penthouse',
  'Studio': 'Residential / Flat',
  'Sala Comercial': 'Commercial / Building',
  'Flat': 'Residential / Flat',
};

const MODALITY_MAP = {
  'Venda': 'For Sale',
  'Aluguel': 'For Rent',
  'Venda e Aluguel': 'Sale/Rent',
};

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildListing(p) {
  const imgs = (p.images || []).map((url, i) =>
    `        <Item medium="image" caption="Foto ${i + 1}"${i === 0 ? ' primary="true"' : ''}>${esc(url)}</Item>`
  ).join('\n');

  const features = (p.amenities || []).map(a =>
    `          <Feature>${esc(a)}</Feature>`
  ).join('\n');

  const desc = p.portal_description || p.description || '';
  const price = Math.round(Number(p.price) || 0);
  const area = Math.round(Number(p.area) || 0);

  return `    <Listing>
      <ListingID>${esc(p.id)}</ListingID>
      <Title><![CDATA[${p.title || ''}]]></Title>
      <TransactionType>${MODALITY_MAP[p.modality] || 'For Sale'}</TransactionType>
      <PublicationType>STANDARD</PublicationType>
${imgs ? `      <Media>\n${imgs}\n${p.video_url ? `        <Item medium="video">${esc(p.video_url)}</Item>\n` : ''}      </Media>` : ''}
      <Details>
        <PropertyType>${TYPE_MAP[p.type] || 'Residential / Home'}</PropertyType>
        <Description><![CDATA[${desc}]]></Description>
        <ListPrice currency="BRL">${price}</ListPrice>
${p.condominium_fee ? `        <PropertyAdministrationFee currency="BRL">${Math.round(Number(p.condominium_fee))}</PropertyAdministrationFee>` : ''}
${p.iptu_annual ? `        <YearlyIppiTax currency="BRL">${Math.round(Number(p.iptu_annual))}</YearlyIppiTax>` : ''}
        <LivingArea unit="square metres">${area}</LivingArea>
${p.bedrooms ? `        <Bedrooms>${p.bedrooms}</Bedrooms>` : ''}
${p.bathrooms ? `        <Bathrooms>${p.bathrooms}</Bathrooms>` : ''}
${p.suites ? `        <Suites>${p.suites}</Suites>` : ''}
${p.garage ? `        <Garage type="Parking Spaces">${p.garage}</Garage>` : ''}
${features ? `        <Features>\n${features}\n        </Features>` : ''}
${p.construction_year ? `        <YearBuilt>${p.construction_year}</YearBuilt>` : ''}
${p.total_floors ? `        <Floors>${p.total_floors}</Floors>` : ''}
${p.floor ? `        <UnitFloor>${p.floor}</UnitFloor>` : ''}
      </Details>
      <Location>
        <Address publiclyVisible="true">${esc(p.address || '')}${p.address_number ? `, ${esc(p.address_number)}` : ''}</Address>
        <Neighborhood>${esc(p.neighborhood || '')}</Neighborhood>
        <City>${esc(p.city || 'Ubatuba')}</City>
        <State>SP</State>
        <Country abbreviation="BR">Brasil</Country>
${p.zip_code ? `        <PostalCode>${esc(p.zip_code)}</PostalCode>` : ''}
      </Location>
      <ContactInfo>
        <Name>Ícaro Negri</Name>
        <Email>contato@vivabeiramar.com.br</Email>
        <Telephone>(11) 92219-0212</Telephone>
      </ContactInfo>
    </Listing>`;
}

export function generateZapXML(properties) {
  const listings = properties.map(p => buildListing(p)).join('\n');
  const now = new Date().toISOString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<ListingDataFeed xmlns="http://www.vivareal.com/schemas/1.0/VRSync"
                  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                  xsi:schemaLocation="http://www.vivareal.com/schemas/1.0/VRSync http://xml.vivareal.com/vrsync.xsd">
  <Header>
    <Provider>Viva Beiramar</Provider>
    <Email>contato@vivabeiramar.com.br</Email>
    <ContactName>Ícaro Negri</ContactName>
    <PublishDate>${now}</PublishDate>
    <Telephone>(11) 92219-0212</Telephone>
  </Header>
  <Listings>
${listings}
  </Listings>
</ListingDataFeed>`;
}

export function downloadXML(xmlString, filename = 'vrsync-feed.xml') {
  const blob = new Blob([xmlString], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
