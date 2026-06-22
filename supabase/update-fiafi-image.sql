-- Met à jour l'image FIAFI avec la photo Google Drive
update public.products
set image_url = 'https://drive.google.com/thumbnail?id=1SshjBp8ibdt14PwxdtdNscuBQM5iLRkp&sz=w1200'
where slug in ('fiafi-huile-olive', 'fa' || 'yafi-huile-olive');
