extern crate tucoflyer;
use tucoflyer::{BotComm, WinchConfig, Config, WebConfig, ControllerMode, BotParams, WinchCalibration, Bus, Point3, interface, controller, watchdog};

fn main() {
    let config = Config {
        controller_addr: "10.32.0.1:9024".parse().unwrap(),
        flyer_addr: "10.32.0.8:9024".parse().unwrap(),
        winches: vec![
            WinchConfig {
                addr: "10.32.0.10:9024".parse().unwrap(),
                loc: Point3::new(10.0, 10.0, 0.0),
                calibration: WinchCalibration {
                    kg_force_at_zero: 0.0,
                    kg_force_per_count: 1.0,
                    m_dist_per_count: 1.0,
                }
            },
            WinchConfig {
                addr: "10.32.0.11:9024".parse().unwrap(),
                loc: Point3::new(10.0, -10.0, 0.0),
                calibration: WinchCalibration {
                    kg_force_at_zero: 0.0,
                    kg_force_per_count: 1.0,
                    m_dist_per_count: 1.0,
                }                
            },
            WinchConfig {
                addr: "10.32.0.12:9024".parse().unwrap(),
                loc: Point3::new(-10.0, -10.0, 0.0),
                calibration: WinchCalibration {
                    kg_force_at_zero: 0.0,
                    kg_force_per_count: 1.0,
                    m_dist_per_count: 1.0,
                }
            },
            WinchConfig {
                addr: "10.32.0.13:9024".parse().unwrap(),
                loc: Point3::new(-10.0, 10.0, 0.0),
                calibration: WinchCalibration {
                    kg_force_at_zero: 0.0,
                    kg_force_per_count: 1.0,
                    m_dist_per_count: 1.0,
                }
            },                
        ],
        params: BotParams {
            accel_rate_m_per_sec2: 10000.0,
            manual_control_velocity_m_per_sec: 16000.0,
            force_min_kg: -50000.0,
            force_max_kg: 700000.0,
            force_filter_param: 0.91,
            pwm_gain_p: 4e-7,
            pwm_gain_i: 0.0,
            pwm_gain_d: 0.0,
        },
        web: WebConfig {
            http_addr: "10.0.0.5:8080".parse().unwrap(),
            ws_addr: "10.0.0.5:8081".parse().unwrap(),
            connection_file_path: "connection.txt".to_owned(),
            web_root_path: "web/build".to_owned(),
        },
        mode: ControllerMode::Normal,
    };

    let bus = Bus::new(config);
    let comm = BotComm::start(&bus).expect("Failed to start bot networking");

    interface::web::start(&bus);
    interface::gamepad::start(&bus);
    controller::start(&bus, &comm);
    watchdog::run(&bus);
}
