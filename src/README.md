
# Leikkausjonon Simulaattori (MVP)

## Yleiskatsaus
Tämä simulaatio-ohjelma on MVP (Minimum Viable Product), joka demonstroi yksinkertaistetulla mallilla yhden erikoisalan tai toimenpidetyypin jonotilannetta ja antaa mahdollisuuden testata resurssimuutosten vaikutusta jonon kehittymiseen.

## Toiminnallisuus
Simulaattori mallintaa:
- Uusien potilaiden saapumisprosessia jonoon
- Leikkauspaikkojen (slottien) kapasiteettia 
- Jonon kehittymistä ajan myötä
- Resurssimuutosten (lisättyjen leikkausslottien) vaikutusta jonoon ja odotusaikoihin

## Käyttöohjeet

### Komentorivityökalu
Voit ajaa simulaation komentoriviltä:

```
python surgical_queue_simulator.py
```

Ohjelma kysyy sinulta tarvittavat luvut ja sen jälkeen näyttää tulokset ja kuvaajat.

### Web-käyttöliittymä
Vaihtoehtoisesti voit käyttää Streamlit-pohjaista web-käyttöliittymää:

```
streamlit run web_simulator.py
```

Tämä käynnistää selaimessa toimivan käyttöliittymän simulaation ajamiseen.

## Tarvittavat tiedot simulaation ajamiseen
1. Keskimääräinen uusien potilaiden (lähetteiden) määrä viikossa
2. Nykyisten leikkausslottien määrä viikossa
3. Jonon pituus simulaation alussa
4. Interventiona lisättävien leikkausslottien määrä
5. Simulaation kesto viikkoina

## Simulaation rajoitukset
- Mallintaa vain yhtä erikoisalaa/toimenpidetyyppiä kerrallaan
- Käyttää FIFO-jonotusta (First In, First Out), ei priorisointia
- Potilaat saapuvat tasaisin välein, ei kausittaista vaihtelua
- Olettaa, että leikkauspaikkojen tarvittavat resurssit (henkilöstö, tilat) ovat aina saatavilla
- Ei huomioi peruutuksia tai muita poikkeustilanteita

## Vaatimukset
Skripti vaatii seuraavat Python-kirjastot:
- simpy
- matplotlib
- numpy
- streamlit (web-käyttöliittymää varten)

Voit asentaa ne komennolla:
```
pip install -r requirements.txt
```
