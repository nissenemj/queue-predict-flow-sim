
import simpy
import random
import matplotlib.pyplot as plt
import numpy as np
from datetime import datetime

# --- Globals for collecting statistics ---
patient_arrival_times = {}  # Store arrival time for each patient ID
patient_wait_times = []
weekly_queue_lengths = []
weekly_surgeries_performed = []
next_patient_id = 0

def get_patient_id():
    """Generates a unique patient ID."""
    global next_patient_id
    next_patient_id += 1
    return next_patient_id

def patient_arrivals(env, avg_arrivals_per_week, initial_queue_size, patient_queue_list):
    """
    Process for generating patient arrivals.
    Adds initial queue and then new arrivals each week.
    """
    global patient_arrival_times

    # Add initial queue patients (assume they arrived at time 0)
    for _ in range(initial_queue_size):
        p_id = get_patient_id()
        arrival_time = 0  # Arrived at the start of simulation
        patient_arrival_times[p_id] = arrival_time
        patient_queue_list.append(p_id)

    # Generate new arrivals each week
    while True:
        # For MVP, add a batch of patients at the start of the week
        # A more advanced model might distribute arrivals throughout the week
        for _ in range(avg_arrivals_per_week):
            p_id = get_patient_id()
            arrival_time = env.now  # Arrive at the current simulation time (start of week)
            patient_arrival_times[p_id] = arrival_time
            patient_queue_list.append(p_id)
        yield env.timeout(7)  # Simulate one week

def operating_room(env, slots_per_week, patient_queue_list):
    """
    Process for performing surgeries.
    Processes patients from the queue based on weekly slot capacity.
    """
    global patient_wait_times, weekly_queue_lengths, weekly_surgeries_performed, patient_arrival_times

    while True:
        surgeries_this_week = 0
        # Process patients up to the number of available slots for the week
        for _ in range(slots_per_week):
            if patient_queue_list:  # If there are patients in the queue
                patient_id = patient_queue_list.pop(0)  # Get patient from front of queue (FIFO)
                
                arrival_time = patient_arrival_times.pop(patient_id)  # Get and remove arrival time
                wait_time = env.now - arrival_time  # Calculate wait time (in days)
                patient_wait_times.append(wait_time)
                
                surgeries_this_week += 1
            else:
                break  # No more patients in queue

        weekly_surgeries_performed.append(surgeries_this_week)
        weekly_queue_lengths.append(len(patient_queue_list))
        
        # Ensure the operating room process yields for a week, even if no patients
        yield env.timeout(7)  # Simulate one week

def run_simulation(
    avg_arrivals_per_week,
    initial_queue_size,
    slots_per_week,
    simulation_duration_weeks,
    scenario_name="Scenario"
):
    """Runs a single simulation scenario and returns collected metrics."""
    global patient_wait_times, weekly_queue_lengths, weekly_surgeries_performed, next_patient_id, patient_arrival_times

    # Reset global collectors for the new scenario
    patient_arrival_times = {}
    patient_wait_times = []
    weekly_queue_lengths = []
    weekly_surgeries_performed = []
    next_patient_id = 0
    
    current_patient_queue = []  # Use a local queue list for this simulation run

    env = simpy.Environment()
    env.process(patient_arrivals(env, avg_arrivals_per_week, initial_queue_size, current_patient_queue))
    env.process(operating_room(env, slots_per_week, current_patient_queue))
    
    simulation_duration_days = simulation_duration_weeks * 7
    env.run(until=simulation_duration_days + 1)  # Run for the specified duration + 1 to capture the last week's stats

    # Prepare results
    avg_wait_time = np.mean(patient_wait_times) if patient_wait_times else 0
    final_queue_length = weekly_queue_lengths[-1] if weekly_queue_lengths else initial_queue_size
    total_surgeries = np.sum(weekly_surgeries_performed)
    
    results = {
        "scenario_name": scenario_name,
        "avg_wait_time": avg_wait_time,
        "final_queue_length": final_queue_length,
        "total_surgeries": total_surgeries,
        "weekly_queue_lengths": weekly_queue_lengths,
        "weekly_surgeries": weekly_surgeries_performed,
        "wait_times": patient_wait_times
    }
    
    return results

def create_graphs(baseline_results, intervention_results, simulation_duration_weeks):
    """Creates and displays graphs comparing the scenarios."""
    # Create figure with subplots
    fig, axs = plt.subplots(2, 2, figsize=(15, 10))
    
    # Plot 1: Queue Length Over Time
    weeks = np.arange(1, len(baseline_results["weekly_queue_lengths"]) + 1)
    axs[0, 0].plot(weeks, baseline_results["weekly_queue_lengths"], 'b-o', label=baseline_results["scenario_name"])
    axs[0, 0].plot(weeks, intervention_results["weekly_queue_lengths"], 'r--x', label=intervention_results["scenario_name"])
    axs[0, 0].set_title('Jonon pituuden kehitys')
    axs[0, 0].set_xlabel('Viikko')
    axs[0, 0].set_ylabel('Jonossa olevien potilaiden määrä')
    axs[0, 0].legend()
    axs[0, 0].grid(True)
    
    # Plot 2: Weekly Surgeries Performed
    axs[0, 1].plot(weeks, baseline_results["weekly_surgeries"], 'b-o', label=baseline_results["scenario_name"])
    axs[0, 1].plot(weeks, intervention_results["weekly_surgeries"], 'r--x', label=intervention_results["scenario_name"])
    axs[0, 1].set_title('Viikoittaiset leikkaukset')
    axs[0, 1].set_xlabel('Viikko')
    axs[0, 1].set_ylabel('Leikkausten määrä')
    axs[0, 1].legend()
    axs[0, 1].grid(True)
    
    # Plot 3: Cumulative Surgeries
    cumulative_base = np.cumsum(baseline_results["weekly_surgeries"])
    cumulative_int = np.cumsum(intervention_results["weekly_surgeries"])
    axs[1, 0].plot(weeks, cumulative_base, 'b-o', label=baseline_results["scenario_name"])
    axs[1, 0].plot(weeks, cumulative_int, 'r--x', label=intervention_results["scenario_name"])
    axs[1, 0].set_title('Kumulatiiviset leikkaukset')
    axs[1, 0].set_xlabel('Viikko')
    axs[1, 0].set_ylabel('Leikkausten kokonaismäärä')
    axs[1, 0].legend()
    axs[1, 0].grid(True)
    
    # Plot 4: Average Wait Time (box plot)
    wait_data = [baseline_results["wait_times"], intervention_results["wait_times"]]
    labels = [baseline_results["scenario_name"], intervention_results["scenario_name"]]
    axs[1, 1].boxplot(wait_data, labels=labels)
    axs[1, 1].set_title('Odotusaika leikkaukseen (päivissä)')
    axs[1, 1].set_ylabel('Päivät')
    axs[1, 1].grid(True)
    
    plt.tight_layout()
    
    # Save the figure with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"simulation_results_{timestamp}.png"
    plt.savefig(filename)
    
    # Also return the figure for web display
    return fig, filename

def main():
    print("--- Leikkausjonon simulaatio MVP ---")
    print("Syötä seuraavat tiedot:")
    
    avg_arrivals_per_week = int(input("Keskimääräinen uusien potilaiden määrä per viikko: "))
    slots_per_week_baseline = int(input("Nykyisten leikkauspaikkojen ('slottien') määrä per viikko: "))
    initial_queue_size = int(input("Jonon pituus simulaation alussa: "))
    intervention_slots = int(input("Intervention jälkeinen leikkauspaikkojen määrä per viikko: "))
    simulation_duration_weeks = int(input("Simulaation kesto viikkoina: "))
    
    print("\nAloitetaan simulaatio...")
    
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
    
    # Print summary results
    print("\n--- TULOKSET ---")
    print(f"\nPerustilanne ({slots_per_week_baseline} slottia/vk):")
    print(f"- Keskimääräinen odotusaika: {baseline_results['avg_wait_time']:.1f} päivää")
    print(f"- Jonon pituus simulaation lopussa: {baseline_results['final_queue_length']} potilasta")
    print(f"- Leikkauksia tehty yhteensä: {baseline_results['total_surgeries']} kpl")
    
    print(f"\nInterventio ({intervention_slots} slottia/vk):")
    print(f"- Keskimääräinen odotusaika: {intervention_results['avg_wait_time']:.1f} päivää")
    print(f"- Jonon pituus simulaation lopussa: {intervention_results['final_queue_length']} potilasta")
    print(f"- Leikkauksia tehty yhteensä: {intervention_results['total_surgeries']} kpl")
    
    # Calculate improvement percentages
    wait_improvement = ((baseline_results['avg_wait_time'] - intervention_results['avg_wait_time']) / 
                       baseline_results['avg_wait_time'] * 100 if baseline_results['avg_wait_time'] > 0 else 0)
    
    queue_improvement = ((baseline_results['final_queue_length'] - intervention_results['final_queue_length']) /
                        baseline_results['final_queue_length'] * 100 if baseline_results['final_queue_length'] > 0 else 0)
    
    surgery_improvement = ((intervention_results['total_surgeries'] - baseline_results['total_surgeries']) / 
                          baseline_results['total_surgeries'] * 100 if baseline_results['total_surgeries'] > 0 else 0)
    
    print("\nInterventio johtaa seuraaviin muutoksiin:")
    print(f"- Odotusaika: {wait_improvement:.1f}% lyhyempi")
    print(f"- Jonon pituus: {queue_improvement:.1f}% lyhyempi")
    print(f"- Leikkauksia: {surgery_improvement:.1f}% enemmän")
    
    # Create and save graphs
    fig, filename = create_graphs(baseline_results, intervention_results, simulation_duration_weeks)
    print(f"\nKuvaajat tallennettu tiedostoon: {filename}")
    
    # Show graphs
    plt.show()

if __name__ == "__main__":
    main()
