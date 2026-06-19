#!/usr/bin/env python3
"""Génère le cahier des charges Word et la présentation PowerPoint HB Commerce."""

from __future__ import annotations

from datetime import date
from html import escape
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
LOGO = ROOT / "assets" / "logo.svg"
TODAY = date.today().strftime("%d/%m/%Y")
SITE = "https://hbconsultingsrv-arch.github.io/hb-commerce"
DEMO_PASSWORD = "Test1234!"

DEMO_ACCOUNTS = [
    ("super@hbcommerce.demo", "Super root", "super-root.html", "Gestion utilisateurs internes HB Commerce"),
    ("admin@hbcommerce.demo", "Admin", "admin.html", "Catalogue, sociétés, commandes, chat, prix"),
    ("agent.martin@hbcommerce.demo", "Agent commercial", "admin.html", "Clients assignés (Le Jasmin, Traiteur Lyon)"),
    ("agent.dubois@hbcommerce.demo", "Agent commercial", "admin.html", "Clients assignés (Bordeaux, Hotel Nice)"),
    ("contact@restaurant-paris.demo", "Client", "compte.html", "Restaurant Le Jasmin — commandes et chat"),
    ("achats@traiteur-lyon.demo", "Client", "compte.html", "Traiteur Lyon Gourmet"),
    ("commandes@epicerie-bdx.demo", "Client", "compte.html", "Epicerie Bordeaux Sud"),
    ("direction@hotel-nice.demo", "Client", "compte.html", "Hotel Riviera Nice"),
    ("inscription@nouvelle-societe.demo", "Société en attente", "compte.html", "Compte pending_company"),
    ("stock@fiafi-tunisie.demo", "Fournisseur", "supplier.html", "Stock FIAFI et commandes fournisseur"),
]

EXAMPLE_PAGES = [
    ("Site vitrine", "index.html", "Accueil FIAFI, marchés France/Luxembourg"),
    ("Catalogue", "produits.html", "Produits B2B, prix masqués sans connexion"),
    ("Panier", "panier.html", "Panier professionnel"),
    ("Checkout", "checkout.html", "Commande et paiement"),
    ("Connexion", "login.html", "Authentification Supabase"),
    ("Inscription", "register.html", "Création compte société"),
    ("Espace client", "compte.html", "Commandes, profil, chat société"),
    ("Administration", "admin.html", "Dashboard opérationnel"),
    ("Super root", "super-root.html", "Utilisateurs internes HB Commerce"),
    ("Fournisseur", "supplier.html", "Stock et approvisionnement"),
    ("Brochure France", "brochure-france.html", "Brochure marché France"),
    ("Brochure Luxembourg", "brochure-luxembourg.html", "Brochure marché Luxembourg"),
    ("Pages démo (index)", "docs/exemples/index.html", "Hub démo avec comptes et liens"),
]

SECTIONS = [
    "1. Contexte et objectifs",
    "2. Périmètre fonctionnel",
    "3. Rôles et permissions",
    "4. Parcours client B2B",
    "5. Dashboard admin",
    "6. Dashboard super root",
    "7. Agents commerciaux",
    "8. Fournisseurs et stock",
    "9. Commandes, factures et livraison",
    "10. Chat et modération",
    "11. Prix personnalisés",
    "12. Environnement de démonstration",
    "13. Pages d'exemple (présentation)",
    "14. Architecture technique",
    "15. Migrations Supabase",
    "16. Déploiement GitHub Pages",
]


def esc(text: str) -> str:
    return escape(str(text), quote=True)


def docx_paragraph(text: str = "", style: str | None = None, bold: bool = False) -> str:
    props = f'<w:pStyle w:val="{style}"/>' if style else ""
    rpr = "<w:b/>" if bold else ""
    return (
        f"<w:p><w:pPr>{props}</w:pPr>"
        f'<w:r><w:rPr>{rpr}</w:rPr><w:t xml:space="preserve">{esc(text)}</w:t></w:r></w:p>'
    )


def build_docx() -> bytes:
    logo_data = LOGO.read_bytes()
    body = [
        docx_paragraph("CAHIER DES CHARGES", "Title"),
        docx_paragraph("HB Commerce — Plateforme B2B FIAFI", "Subtitle"),
        docx_paragraph(""),
        docx_paragraph("Informations document", "Heading1"),
        docx_paragraph(f"Créateur : HB Consulting & Services / HB Commerce"),
        docx_paragraph(f"Dernière modification : {TODAY}"),
        docx_paragraph(f"Version : 1.2"),
        docx_paragraph(f"Site de démonstration : {SITE}"),
        docx_paragraph(""),
        docx_paragraph("Tableau d'évolution", "Heading1"),
        docx_paragraph("Version | Date | Auteur | Modification | Statut", bold=True),
        docx_paragraph("1.0 | 18/06/2026 | HB Commerce | Création initiale | Validé"),
        docx_paragraph("1.1 | 18/06/2026 | HB Commerce | Fournisseurs, stock, agents, factures | Validé"),
        docx_paragraph(f"1.2 | {TODAY} | HB Commerce | Index démo, pages d'exemple, modération chat | Validé"),
        docx_paragraph(""),
        docx_paragraph("Sommaire", "Heading1"),
    ]
    body.extend(docx_paragraph(section) for section in SECTIONS)
    body.append(docx_paragraph(""))
    body.append(docx_paragraph("12. Environnement de démonstration", "Heading1"))
    body.append(docx_paragraph(f"Mot de passe commun : {DEMO_PASSWORD}"))
    body.append(docx_paragraph("Script SQL : supabase/seed-demo-data.sql"))
    body.append(docx_paragraph("Prérequis : schema.sql + migrations puis exécution du seed."))
    body.append(docx_paragraph("Migration chat : supabase/migration-chat-moderation-policies.sql"))
    body.append(docx_paragraph(""))
    body.append(docx_paragraph("Comptes de démonstration", "Heading2"))
    body.append(docx_paragraph("E-mail | Rôle | Page principale | Description", bold=True))
    for email, role, page, desc in DEMO_ACCOUNTS:
        body.append(docx_paragraph(f"{email} | {role} | {page} | {desc}"))
    body.append(docx_paragraph(""))
    body.append(docx_paragraph("13. Pages d'exemple (présentation)", "Heading1"))
    body.append(docx_paragraph("Page | Fichier | Description", bold=True))
    for title, path, desc in EXAMPLE_PAGES:
        body.append(docx_paragraph(f"{title} | {path} | {desc}"))
        body.append(docx_paragraph(f"URL : {SITE}/{path}"))
    body.append(docx_paragraph(""))
    body.append(docx_paragraph("14. Architecture technique", "Heading1"))
    body.append(docx_paragraph("Frontend statique : HTML/CSS/JS sur GitHub Pages."))
    body.append(docx_paragraph("Backend : Supabase (auth, PostgreSQL, RLS)."))
    body.append(docx_paragraph("Paiement : virement, chèque, Stripe (optionnel)."))

    document_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    {''.join(body)}
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr>
  </w:body>
</w:document>"""

    styles_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:qFormat/><w:rPr><w:b/><w:sz w:val="36"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:rPr><w:sz w:val="24"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:qFormat/><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="1A5C4A"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style>
</w:styles>"""

    header_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:p><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">
    <wp:extent cx="1905000" cy="400050"/><wp:docPr id="1" name="Logo"/>
    <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
      <pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="logo.svg"/><pic:cNvPicPr/></pic:nvPicPr>
      <pic:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
      <pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1905000" cy="400050"/></a:xfrm>
      <a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>
      </pic:pic></a:graphicData></a:graphic>
  </wp:inline></w:drawing></w:r>
  <w:r><w:t xml:space="preserve">  HB Commerce — Cahier des charges v1.2</w:t></w:r></w:p>
</w:hdr>"""

    content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="svg" ContentType="image/svg+xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>"""

    rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>"""

    doc_rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>"""

    header_rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/logo.svg"/>
</Relationships>"""

    core = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
  xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Cahier des charges HB Commerce</dc:title>
  <dc:creator>HB Commerce</dc:creator>
  <dcterms:modified xsi:type="dcterms:W3CDTF">{date.today().isoformat()}</dcterms:modified>
</cp:coreProperties>"""

    out_path = DOCS / "cahier-des-charges-hb-commerce.docx"
    DOCS.mkdir(parents=True, exist_ok=True)
    with ZipFile(out_path, "w", ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", content_types)
        zf.writestr("_rels/.rels", rels)
        zf.writestr("word/document.xml", document_xml)
        zf.writestr("word/styles.xml", styles_xml)
        zf.writestr("word/header1.xml", header_xml)
        zf.writestr("word/_rels/document.xml.rels", doc_rels)
        zf.writestr("word/_rels/header1.xml.rels", header_rels)
        zf.writestr("word/media/logo.svg", logo_data)
        zf.writestr("docProps/core.xml", core)
    return out_path.read_bytes()


def pptx_slide(title: str, lines: list[str]) -> str:
    text_body = "".join(f"<a:p><a:r><a:t>{esc(line)}</a:t></a:r></a:p>" for line in lines)
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree>
    <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
    <p:grpSpPr/>
    <p:sp><p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
      <p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/>
        <a:p><a:r><a:rPr b="1" sz="3600"><a:solidFill><a:srgbClr val="1A5C4A"/></a:solidFill></a:rPr>
        <a:t>{esc(title)}</a:t></a:r></a:p>
        {text_body}
      </a:txBody></p:sp>
  </p:spTree></p:cSld>
</p:sld>"""


def build_pptx() -> Path:
    slides = [
        ("HB Commerce", ["Plateforme B2B — Huile FIAFI", "HB Consulting & Services", TODAY]),
        ("Objectifs", [
            "Vente en gros B2B avec espace client",
            "Gestion admin, agents, fournisseurs",
            "Commandes, livraison, chat modéré",
        ]),
        ("Rôles", [
            "Super root — utilisateurs internes",
            "Admin — opérations catalogue et sociétés",
            "Agent commercial — clients assignés",
            "Client / Fournisseur / Société en attente",
        ]),
        ("Environnement démo", [
            f"Site : {SITE}",
            f"Mot de passe : {DEMO_PASSWORD}",
            "Script : supabase/seed-demo-data.sql",
            "Hub : docs/exemples/index.html",
        ]),
        ("Comptes démo — internes", [
            "super@hbcommerce.demo → Super root",
            "admin@hbcommerce.demo → Admin",
            "agent.martin@ / agent.dubois@ → Agents",
        ]),
        ("Comptes démo — clients", [
            "contact@restaurant-paris.demo — Le Jasmin",
            "achats@traiteur-lyon.demo — Traiteur Lyon",
            "commandes@epicerie-bdx.demo — Bordeaux",
            "direction@hotel-nice.demo — Hotel Nice",
        ]),
        ("Comptes démo — autres", [
            "stock@fiafi-tunisie.demo → Fournisseur",
            "inscription@nouvelle-societe.demo → En attente",
        ]),
        ("Pages d'exemple — vitrine", [
            f"{SITE}/index.html — Accueil",
            f"{SITE}/produits.html — Catalogue",
            f"{SITE}/brochure-france.html — Brochure FR",
        ]),
        ("Pages d'exemple — commande", [
            f"{SITE}/panier.html — Panier",
            f"{SITE}/checkout.html — Paiement",
            f"{SITE}/compte.html — Espace client",
        ]),
        ("Pages d'exemple — back-office", [
            f"{SITE}/admin.html — Dashboard admin",
            f"{SITE}/super-root.html — Super root",
            f"{SITE}/supplier.html — Fournisseur",
        ]),
        ("Architecture", [
            "Frontend : GitHub Pages (HTML/CSS/JS)",
            "Backend : Supabase Auth + PostgreSQL + RLS",
            "Paiement : virement, chèque, Stripe",
        ]),
        ("Prochaines étapes", [
            "Exécuter migrations Supabase manquantes",
            "Tester parcours demo par rôle",
            "Personnaliser catalogues par marché",
        ]),
    ]

    out_path = DOCS / "presentation-hb-commerce.pptx"
    slide_parts = []
    slide_rels = []
    for idx, (title, lines) in enumerate(slides, start=1):
        slide_parts.append((f"ppt/slides/slide{idx}.xml", pptx_slide(title, lines)))
        rel = "rId2" if idx == 1 else "rId1"
        slide_rels.append(
            f'<Relationship Id="rId{idx + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide{idx}.xml"/>'
        )

    presentation_rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
""" + "\n".join(slide_rels) + """
</Relationships>"""

    sld_ids = "".join(
        f'<p:sldId id="{256 + i}" r:id="rId{i + 1}"/>' for i in range(len(slides))
    )
    presentation_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
  <p:sldIdLst>{sld_ids}</p:sldIdLst>
  <p:sldSz cx="9144000" cy="6858000"/>
</p:presentation>"""

    slide_master = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree>
    <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
    <p:grpSpPr/>
  </p:spTree></p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst><p:sldLayoutId id="1" r:id="rId1"/></p:sldLayoutIdLst>
</p:sldMaster>"""

    content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
""" + "".join(
        f'<Override PartName="/ppt/slides/slide{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>'
        for i in range(1, len(slides) + 1)
    ) + """
</Types>"""

    rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>"""

    master_rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>"""

    layout = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld name="Blank"><p:spTree>
    <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
    <p:grpSpPr/>
  </p:spTree></p:cSld>
</p:sldLayout>"""

    with ZipFile(out_path, "w", ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", content_types)
        zf.writestr("_rels/.rels", rels)
        zf.writestr("ppt/presentation.xml", presentation_xml)
        zf.writestr("ppt/_rels/presentation.xml.rels", presentation_rels)
        zf.writestr("ppt/slideMasters/slideMaster1.xml", slide_master)
        zf.writestr("ppt/slideMasters/_rels/slideMaster1.xml.rels", master_rels)
        zf.writestr("ppt/slideLayouts/slideLayout1.xml", layout)
        for name, content in slide_parts:
            zf.writestr(name, content)
    return out_path


def main() -> None:
    build_docx()
    build_pptx()
    print(f"Generated docs in {DOCS}")


if __name__ == "__main__":
    main()
