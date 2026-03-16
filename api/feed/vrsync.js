const SUPABASE_URL = 'https://hcmpjrqpjohksoznoycq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjbXBqcnFwam9oa3Nvem5veWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTk0NjAsImV4cCI6MjA4ODU3NTQ2MH0.XRWi4ZULpICkTucXgGVQCP5wq1RmVwOFWTdMrOEMDnw';

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

async function sbGet(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers });
  const d = await r.json();
  return Array.isArray(d) ? d : [];
}

// --- Type mappings ---
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
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildListing(p, contact) {
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
        <Name>${esc(contact.name)}</Name>
        <Email>${esc(contact.email)}</Email>
        <Telephone>${esc(contact.phone)}</Telephone>
      </ContactInfo>
    </Listing>`;
}

export default async function handler(req, res) {
  try {
    // 1. Fetch published properties
    const portals = await sbGet(
      'property_portals?is_published=eq.true&select=property_id,portal_name'
    );
    const publishedIds = [...new Set(portals.map(p => p.property_id))];

    let properties = [];
    if (publishedIds.length > 0) {
      properties = await sbGet(
        `properties?id=in.(${publishedIds.join(',')})&status=eq.Disponível&select=*`
      );
    }

    // 2. Fetch contact info
    const settings = await sbGet('admin_settings?key=in.(corretor_nome,corretor_email,corretor_telefone,corretor_creci)&select=key,value');
    const cfg = {};
    settings.forEach(s => { cfg[s.key] = s.value; });
    const contact = {
      name: cfg.corretor_nome || 'Viva Beiramar',
      email: cfg.corretor_email || 'contato@vivabeiramar.com.br',
      phone: cfg.corretor_telefone || '',
      creci: cfg.corretor_creci || '',
    };

    // 3. Build XML
    const listings = properties.map(p => buildListing(p, contact)).join('\n');
    const now = new Date().toISOString();

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ListingDataFeed xmlns="http://www.vivareal.com/schemas/1.0/VRSync"
                  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                  xsi:schemaLocation="http://www.vivareal.com/schemas/1.0/VRSync http://xml.vivareal.com/vrsync.xsd">
  <Header>
    <Provider>Viva Beiramar</Provider>
    <Email>${esc(contact.email)}</Email>
    <ContactName>${esc(contact.name)}</ContactName>
    <PublishDate>${now}</PublishDate>
    <Telephone>${esc(contact.phone)}</Telephone>
  </Header>
  <Listings>
${listings}
  </Listings>
</ListingDataFeed>`;

    // 4. Log the access
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/portal_sync_logs`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({
          portal_name: 'vrsync',
          sync_type: 'xml_read',
          status: 'success',
          properties_synced: properties.length,
          properties_failed: 0,
          details: { user_agent: req.headers['user-agent'] || '', ip: req.headers['x-forwarded-for'] || '' },
        }),
      });
    } catch (e) { /* logging is best-effort */ }

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).send(xml);
  } catch (error) {
    console.error('Feed error:', error);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    return res.status(500).send(`<?xml version="1.0" encoding="UTF-8"?><error>${esc(error.message)}</error>`);
  }
}
