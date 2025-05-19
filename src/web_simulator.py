
import streamlit as st
import matplotlib.pyplot as plt
import numpy as np
from surgical_queue_simulator import run_simulation, create_graphs

def main():
    st.set_page_config(page_title="Leikkausjonon Simulaattori", layout="wide")
    
    st.title("Leikkausjonon Simulaattori (MVP)")
    st.markdown("""
    Tämä MVP-sovellus simuloi valitun erikoisalan/toimenpiteen jonotilannetta ja arvioi resurssimuutosten vaikutusta.
    Syötä arvot alla oleviin kenttiin ja paina 'Suorita simulaatio' -nappia nähdäksesi tulokset.
    """)
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.header("Simulaation parametrit")
        
        st.subheader("Potilasvirta")
        avg_arrivals_per_week = st.number_input("Keskimääräinen uusien potilaiden määrä per viikko", 
                                               min_value=1, value=15, step=1)
        
        st.subheader("Nykyinen resurssikapasiteetti")
        slots_per_week_baseline = st.number_input("Nykyisten leikkauspaikkojen ('slottien') määrä per viikko", 
                                                min_value=1, value=12, step=1)
        
        st.subheader("Jonon alkutilanne")
        initial_queue_size = st.number_input("Jonossa olevien potilaiden määrä simulaation alussa", 
                                            min_value=0, value=150, step=1)
        
        st.subheader("Interventio")
        intervention_type = st.radio("Intervention tyyppi", ["Lisää leikkauspaikkoja", "Muuta leikkauspaikkojen määrää"])
        
        if intervention_type == "Lisää leikkauspaikkoja":
            additional_slots = st.number_input("Lisättävien leikkauspaikkojen määrä per viikko", 
                                             min_value=1, value=2, step=1)
            intervention_slots = slots_per_week_baseline + additional_slots
        else:
            intervention_slots = st.number_input("Intervention jälkeinen leikkauspaikkojen kokonaismäärä per viikko", 
                                              min_value=1, value=(slots_per_week_baseline + 2), step=1)
        
        st.subheader("Simulaation asetukset")
        simulation_duration_weeks = st.slider("Simulaation kesto viikkoina", 
                                             min_value=4, max_value=104, value=26, step=4)
    
    with col2:
        st.header("Simulaation tiedot")
        st.subheader("Nykytilanteen yhteenveto")
        if avg_arrivals_per_week > slots_per_week_baseline:
            st.warning(f"⚠️ Nykyisillä resursseilla ({slots_per_week_baseline} leikkauspaikkaa/vk) " + 
                     f"ei pystytä hoitamaan kaikkia uusia potilaita ({avg_arrivals_per_week}/vk). Jono kasvaa jatkuvasti.")
        elif avg_arrivals_per_week < slots_per_week_baseline:
            st.success(f"✅ Nykyiset resurssit ({slots_per_week_baseline} leikkauspaikkaa/vk) " + 
                     f"riittävät kaikkien uusien potilaiden ({avg_arrivals_per_week}/vk) hoitamiseen ja jonon purkamiseen.")
        else:
            st.info(f"ℹ️ Nykyiset resurssit ({slots_per_week_baseline} leikkauspaikkaa/vk) " +
                  f"riittävät juuri uusien potilaiden ({avg_arrivals_per_week}/vk) hoitamiseen, mutta jono ei lyhene.")
        
        st.subheader("Intervention yhteenveto")
        if avg_arrivals_per_week > intervention_slots:
            st.warning(f"⚠️ Intervention jälkeisillä resursseilla ({intervention_slots} leikkauspaikkaa/vk) " +
                     f"ei pystytä hoitamaan kaikkia uusia potilaita ({avg_arrivals_per_week}/vk). Jono kasvaa edelleen hitaammin.")
        elif avg_arrivals_per_week < intervention_slots:
            st.success(f"✅ Intervention jälkeiset resurssit ({intervention_slots} leikkauspaikkaa/vk) " +
                     f"riittävät kaikkien uusien potilaiden ({avg_arrivals_per_week}/vk) hoitamiseen ja jonon purkamiseen.")
        else:
            st.info(f"ℹ️ Intervention jälkeiset resurssit ({intervention_slots} leikkauspaikkaa/vk) " +
                  f"riittävät juuri uusien potilaiden ({avg_arrivals_per_week}/vk) hoitamiseen, mutta jono ei lyhene.")
    
    if st.button("Suorita simulaatio", type="primary"):
        with st.spinner("Suoritetaan simulaatiota..."):
            # Run baseline scenario
            baseline_results = run_simulation(
                avg_arrivals_per_week=avg_arrivals_per_week,
                initial_queue_size=initial_queue_size,
                slots_per_week=slots_per_week_baseline,
                simulation_duration_weeks=simulation_duration_weeks,
                scenario_name=f"Perustilanne ({slots_per_week_baseline} slottia/vk)"
            )
            
            # Run intervention scenario
            intervention_results = run_simulation(
                avg_arrivals_per_week=avg_arrivals_per_week,
                initial_queue_size=initial_queue_size,
                slots_per_week=intervention_slots,
                simulation_duration_weeks=simulation_duration_weeks,
                scenario_name=f"Interventio ({intervention_slots} slottia/vk)"
            )
            
            # Create graphs as a matplotlib figure
            fig, _ = create_graphs(baseline_results, intervention_results, simulation_duration_weeks)
            
            # Display results
            st.header("Simulaation tulokset")
            
            # Results in columns
            col1, col2 = st.columns(2)
            
            with col1:
                st.subheader(f"Perustilanne ({slots_per_week_baseline} slottia/vk)")
                st.metric("Keskimääräinen odotusaika", f"{baseline_results['avg_wait_time']:.1f} päivää")
                st.metric("Jonon pituus simulaation lopussa", f"{baseline_results['final_queue_length']} potilasta")
                st.metric("Leikkauksia tehty yhteensä", f"{baseline_results['total_surgeries']} kpl")
                
            with col2:
                st.subheader(f"Interventio ({intervention_slots} slottia/vk)")
                
                # Calculate improvement percentages
                wait_improvement = ((baseline_results['avg_wait_time'] - intervention_results['avg_wait_time']) / 
                                  baseline_results['avg_wait_time'] * 100 if baseline_results['avg_wait_time'] > 0 else 0)
                
                queue_improvement = ((baseline_results['final_queue_length'] - intervention_results['final_queue_length']) /
                                  baseline_results['final_queue_length'] * 100 if baseline_results['final_queue_length'] > 0 else 0)
                
                surgery_improvement = ((intervention_results['total_surgeries'] - baseline_results['total_surgeries']) / 
                                    baseline_results['total_surgeries'] * 100 if baseline_results['total_surgeries'] > 0 else 0)
                
                st.metric("Keskimääräinen odotusaika", 
                        f"{intervention_results['avg_wait_time']:.1f} päivää", 
                        f"{wait_improvement:.1f}% parannus" if wait_improvement > 0 else f"{-wait_improvement:.1f}% huononnus")
                
                st.metric("Jonon pituus simulaation lopussa", 
                        f"{intervention_results['final_queue_length']} potilasta",
                        f"{queue_improvement:.1f}% lyhyempi" if queue_improvement > 0 else f"{-queue_improvement:.1f}% pidempi")
                
                st.metric("Leikkauksia tehty yhteensä", 
                        f"{intervention_results['total_surgeries']} kpl",
                        f"{surgery_improvement:.1f}% enemmän" if surgery_improvement > 0 else f"{-surgery_improvement:.1f}% vähemmän")
            
            # Display the matplotlib figure in Streamlit
            st.pyplot(fig)

if __name__ == "__main__":
    main()
